# =========================================================================================
# main.py  —  FastAPI backend for Ration Anomaly graphs
#
# 🎯 What’s in here
#  - Endpoints that return JSON with base64-embedded PNG images:
#       GET /graph               -> main scatter (Ration Amount vs Claim Delay, anomalies marked)
#       GET /graphs/patterns     -> (1) TokenID vs Aadhaar "pattern" scatter, (2) Anomaly-type bar chart
#       GET /anomalies           -> anomaly counts + sample rule-based anomaly details
#       GET /latest              -> last scheduled run + current interpretation
#
#  - Robust plotting (matplotlib) that avoids "StrCategoryConverter"/"sci()" errors.
#  - CORS enabled for Next.js dev origins (http://localhost:3000 / http://127.0.0.1:3000).
#  - Lots of comments to help your Next.js teammate connect without touching this file.
#
# 🧩 Next.js integration (pick ONE of these patterns)
#  -----------------------------------------------------------------------------------------
#  Option A (RECOMMENDED: no CORS headaches)
#    1) In your Next app, add a rewrite proxy in next.config.js:
#
#         module.exports = {
#           async rewrites() {
#             return [
#               { source: '/fastapi/:path*', destination: 'http://127.0.0.1:8000/:path*' },
#             ];
#           },
#         };
#
#    2) From your React/Next code, fetch using the proxy path (same-origin):
#         fetch('/fastapi/graph')
#         fetch('/fastapi/graphs/patterns')
#
#    3) You DO NOT need to change anything here. CORS doesn’t apply to server-side rewrites.
#
#  Option B (Direct calls from the browser)
#    1) Keep the CORS settings below as-is (they already allow :3000 origins).
#    2) In your Next app, set a .env.local:
#         NEXT_PUBLIC_API_BASE=http://127.0.0.1:8000
#    3) In React/Next, call:
#         const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://127.0.0.1:8000';
#         fetch(`${API_BASE}/graph`);
#         fetch(`${API_BASE}/graphs/patterns`);
#
#  Both endpoints return JSON that includes:
#    - image_data_url: "data:image/png;base64,...."  (drop straight into <img src=...>)
#    - insights / stats / anomaly_type_counts (plain JSON objects/arrays)
#
# =========================================================================================

# ------------------- IMPORTS & CONFIG -------------------
import matplotlib
matplotlib.use("Agg")  # headless backend (no GUI)

import matplotlib.pyplot as plt
import warnings
warnings.filterwarnings("ignore", category=UserWarning, module="sklearn")

import io, base64, json, datetime, logging
from collections import Counter, defaultdict
from typing import Dict, List, Tuple, Any, Optional

import pandas as pd
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# 👉 If you're actually on-chain, keep these imports; otherwise stub them for local testing.
from web3 import Web3
from web3.middleware.proof_of_authority import ExtraDataToPOAMiddleware

from pyod.models.iforest import IForest
from apscheduler.schedulers.background import BackgroundScheduler

# 🔧 Your RPC + contract address come from config.py
from config import RPC_URL, CONTRACT_ADDRESS  # make sure config.py is present alongside main.py


# ------------------- FASTAPI APP -------------------
app = FastAPI(title="Blockchain Ration Anomaly API")

# ------------------- CORS (for Next.js dev servers) -------------------
# If you use Next rewrites (Option A), these origins are not strictly required—but harmless.
# If you fetch directly from browser (Option B), these are REQUIRED.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:3000",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------- LOGGING -------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
)

# ------------------- BLOCKCHAIN CONNECTION -------------------
with open("DCVToken.json") as f:
    token_abi = json.load(f)

w3 = Web3(Web3.HTTPProvider(RPC_URL))
w3.middleware_onion.inject(ExtraDataToPOAMiddleware, layer=0)
contract = w3.eth.contract(address=CONTRACT_ADDRESS, abi=token_abi)

# ------------------- GLOBAL STORAGE -------------------
latest_df: Optional[pd.DataFrame] = None
latest_results: Optional[Dict[str, Any]] = None


# ------------------- HELPERS -------------------
def _to_b64_png(fig) -> str:
    """Return a base64 (no header) PNG from a matplotlib Figure."""
    buf = io.BytesIO()
    fig.savefig(buf, format="png", bbox_inches="tight")
    plt.close(fig)
    buf.seek(0)
    return base64.b64encode(buf.read()).decode("utf-8")


def _data_url(b64: str) -> str:
    return f"data:image/png;base64,{b64}"


def _mask_aadhaar(aadhaar: Any, visible: int = 4) -> str:
    """
    Privacy-friendly Aadhaar display: keep only last `visible` digits.
    If you want full Aadhaar on the chart, set `visible=12` or return str(aadhaar) directly.
    """
    s = str(aadhaar or "")
    if len(s) <= visible:
        return s
    return "•" * (len(s) - visible) + s[-visible:]


def _human_seconds(seconds: float) -> str:
    seconds = max(0, float(seconds))
    mins, secs = divmod(int(seconds), 60)
    hours, mins = divmod(mins, 60)
    if hours:
        return f"{hours}h {mins}m {secs}s"
    if mins:
        return f"{mins}m {secs}s"
    return f"{secs}s"


# ------------------- FETCH TOKEN DATA -------------------
def fetch_tokens_data() -> pd.DataFrame:
    """Fetch token data from blockchain and preprocess into DataFrame."""
    token_ids = contract.functions.getAllTokens().call()
    records = []

    for tid in token_ids:
        data = contract.functions.getTokenData(tid).call()
        issued = datetime.datetime.fromtimestamp(data[4])
        expiry = datetime.datetime.fromtimestamp(data[5])
        claim = datetime.datetime.fromtimestamp(data[6]) if data[6] > 0 else None

        records.append({
            "tokenId": data[0],
            "aadhaar": str(data[1]),
            "rationAmount": data[3],
            "issuedTime": issued,
            "expiryTime": expiry,
            "claimTime": claim,
            "isClaimed": data[7],
            "isExpired": data[8],
            "category": data[9],
            # Optional extras if ABI has them at these indices:
            "familyId": data[10] if len(data) > 10 else None,
            "location": data[11] if len(data) > 11 else None,
            "issuedBy": data[12] if len(data) > 12 else None,
        })

    df = pd.DataFrame(records)

    # Feature engineering
    df["claimDelay"] = (df["claimTime"] - df["issuedTime"]).dt.total_seconds().fillna(0)
    df["claimDelay"] = df["claimDelay"].clip(lower=0)
    df["oddHour"] = df["issuedTime"].dt.hour
    df["month"] = df["issuedTime"].dt.month
    df["year"] = df["issuedTime"].dt.year
    df["expiredUsage"] = ((df["isExpired"]) & (df["isClaimed"])).astype(int)

    return df


# ------------------- RULE-BASED ANOMALIES -------------------
def detect_rule_based_anomalies(df: pd.DataFrame) -> List[Dict[str, Any]]:
    anomalies = []
    avg_ration = df["rationAmount"].mean() if len(df) > 0 else 0

    for _, row in df.iterrows():
        reasons = []

        # 1) Odd hour (midnight-5am)
        if pd.notnull(row["issuedTime"]) and row["issuedTime"].hour < 5:
            reasons.append(f"Delivery at unusual hour ({row['issuedTime'].strftime('%H:%M')})")

        # 2) Expired token claimed
        if row["isExpired"] and row["isClaimed"]:
            reasons.append("Expired token was claimed")

        # 3) Token expired without claim
        if row["isExpired"] and not row["isClaimed"]:
            reasons.append("Token expired without claim")

        # 4) Multiple tokens same month for same Aadhaar
        month_count = df[(df["aadhaar"] == row["aadhaar"]) &
                         (df["month"] == row["month"]) &
                         (df["year"] == row["year"])].shape[0]
        if month_count > 1:
            reasons.append(f"Multiple tokens issued for Aadhaar {row['aadhaar']} in {row['month']}/{row['year']}")

        # 5/6) Unusually high/low ration allocation
        if avg_ration > 0 and row["rationAmount"] > 2 * avg_ration:
            reasons.append("Unusually high ration allocation")
        if avg_ration > 0 and row["rationAmount"] < 0.5 * avg_ration:
            reasons.append("Unusually low ration allocation")

        # 7) Instant claim (<60s)
        if pd.notnull(row["claimTime"]) and row["claimDelay"] < 60:
            reasons.append(f"Claimed instantly after issue ({row['claimTime'].strftime('%H:%M')})")

        # 8) Claim after expiry
        if pd.notnull(row["claimTime"]) and row["claimTime"] > row["expiryTime"]:
            reasons.append("Claim attempted after token expiry")

        # 9) Invalid category
        if row["category"] not in ["BPL", "APL", "Priority", "Antyodaya"]:
            reasons.append(f"Unknown or invalid category '{row['category']}'")

        # 10) Same Aadhaar across multiple familyIds
        if row["familyId"] and (df[df["aadhaar"] == row["aadhaar"]]["familyId"].nunique() > 1):
            reasons.append(f"Aadhaar {row['aadhaar']} linked to multiple family IDs")

        # 11) Aadhaar used in multiple locations
        if row["location"] and (df[df["aadhaar"] == row["aadhaar"]]["location"].nunique() > 1):
            reasons.append(f"Aadhaar {row['aadhaar']} used in multiple locations")

        # 12) Double claim (same tokenId marked claimed more than once)
        if row["isClaimed"] and df[(df["tokenId"] == row["tokenId"]) & (df["isClaimed"] == True)].shape[0] > 1:
            reasons.append("Token claimed more than once (double claim)")

        # 13) Repeatedly unclaimed Aadhaar
        unclaimed = df[(df["aadhaar"] == row["aadhaar"]) & (df["isClaimed"] == False)].shape[0]
        if unclaimed > 3:
            reasons.append(f"Aadhaar {row['aadhaar']} has {unclaimed} unclaimed tokens")

        # 14) Suspicious issuer concentration
        if row["issuedBy"] and df["issuedBy"].value_counts().max() > 0.9 * len(df):
            reasons.append(f"Suspicious concentration: {row['issuedBy']} issued almost all tokens")

        # 15) Spike: many tokens same day
        day_count = df[df["issuedTime"].dt.date == row["issuedTime"].date()].shape[0]
        if day_count > (df.shape[0] / max(1, df["issuedTime"].dt.date.nunique())) * 2:
            reasons.append(f"Spike: unusually high number of tokens issued on {row['issuedTime'].date()}")

        if reasons:
            anomalies.append({
                "tokenId": row["tokenId"],
                "aadhaar": row["aadhaar"],
                "issuedAt": row["issuedTime"].strftime("%d-%m-%Y %H:%M") if pd.notnull(row["issuedTime"]) else None,
                "claimAt": row["claimTime"].strftime("%d-%m-%Y %H:%M") if pd.notnull(row["claimTime"]) else None,
                "reasons": reasons
            })

    return anomalies


# ------------------- ML ANOMALIES -------------------
def run_anomaly_detection(df: pd.DataFrame) -> Dict[str, Any]:
    if df.empty:
        return {"ml_detected": 0, "rule_detected": 0, "details": []}

    features = df[["rationAmount", "claimDelay", "oddHour", "expiredUsage"]].values
    model = IForest(random_state=42)  # stable results
    model.fit(features)
    df["ml_anomaly"] = model.predict(features)  # 1=outlier, 0=normal

    rule_anomalies = detect_rule_based_anomalies(df)

    return {
        "ml_detected": int(df["ml_anomaly"].sum()),
        "rule_detected": len(rule_anomalies),
        "details": rule_anomalies,
    }


# ------------------- INTERPRETATION -------------------
def interpret_graph(df: pd.DataFrame) -> Dict[str, Any]:
    if df.empty:
        return {"insights": ["No data available to generate insights."], "stats": {}}

    n = len(df)
    anomalies = int(df.get("ml_anomaly", pd.Series([0] * n)).sum())
    anomaly_rate = anomalies / n if n else 0.0

    # Correlation (robust)
    corr = None
    try:
        sub = df[["rationAmount", "claimDelay"]].dropna()
        if len(sub) >= 3 and sub["rationAmount"].std() > 0 and sub["claimDelay"].std() > 0:
            corr = float(sub["rationAmount"].corr(sub["claimDelay"]))
    except Exception:
        corr = None

    avg_delay = df["claimDelay"].dropna().mean() if "claimDelay" in df else None

    hh = df["oddHour"].dropna().astype(int)
    top_hours = hh.value_counts().head(3).index.tolist() if not hh.empty else []

    insights = []
    insights.append(f"Detected {anomalies} ML anomalies out of {n} records ({anomaly_rate:.1%} anomaly rate).")
    if corr is not None:
        if corr > 0.3:
            insights.append("Higher ration amounts tend to correlate with **longer** claim delays.")
        elif corr < -0.3:
            insights.append("Higher ration amounts tend to correlate with **shorter** claim delays.")
        else:
            insights.append("No strong linear relationship between ration amount and claim delay.")
    else:
        insights.append("Correlation could not be computed reliably (insufficient variance or data).")

    if avg_delay is not None:
        insights.append(f"Average claim delay is ~{_human_seconds(avg_delay)}.")

    if top_hours:
        hour_list = ", ".join(f"{h:02d}:00" for h in top_hours)
        insights.append(f"Most frequent issue times in the dataset: {hour_list}.")
    else:
        insights.append("Issue times were not informative for this run.")

    insights.append(
        "Points marked as anomalies may indicate instant claims, expired claims, unusual issuance hours, "
        "repeated unclaimed tokens, or abnormal ration amounts."
    )

    stats = {
        "total_points": n,
        "ml_anomalies": anomalies,
        "anomaly_rate": round(anomaly_rate, 4),
        "corr_ration_vs_delay": None if corr is None else round(corr, 4),
        "avg_claim_delay_sec": None if avg_delay is None else round(float(avg_delay), 2),
        "top_issue_hours": top_hours,
    }

    return {"insights": insights, "stats": stats}


# ------------------- GRAPH GENERATORS -------------------
def generate_main_scatter_payload(df: pd.DataFrame) -> Dict[str, Any]:
    """Scatter of Ration Amount vs Claim Delay with anomalies marked (x=amount, y=delay)."""
    if "ml_anomaly" not in df.columns:
        # ensure anomalies exist (e.g., if /graph called before /anomalies)
        features = df[["rationAmount", "claimDelay", "oddHour", "expiredUsage"]].values
        model = IForest(random_state=42)
        model.fit(features)
        df["ml_anomaly"] = model.predict(features)

    # Coerce numeric safely
    x = pd.to_numeric(df.get("rationAmount"), errors="coerce")
    y = pd.to_numeric(df.get("claimDelay"), errors="coerce")
    lbl = df.get("ml_anomaly")
    mask = x.notna() & y.notna() & lbl.notna()

    fig, ax = plt.subplots(figsize=(8, 6))
    if not mask.any():
        ax.text(0.5, 0.5, "No valid points to plot", ha="center", va="center", fontsize=12)
        ax.set_xlabel("Ration Amount")
        ax.set_ylabel("Claim Delay (seconds)")
        ax.set_title("Anomaly Detection: Ration vs Claim Delay")
        ax.grid(True)
    else:
        normal_mask = (lbl[mask] == 0)
        x_m, y_m = x[mask], y[mask]
        ax.scatter(x_m[normal_mask], y_m[normal_mask], alpha=0.7, label="Normal")
        ax.scatter(x_m[~normal_mask], y_m[~normal_mask], alpha=0.9, marker="x", label="Anomaly")
        ax.set_xlabel("Ration Amount")
        ax.set_ylabel("Claim Delay (seconds)")
        ax.set_title("Anomaly Detection: Ration vs Claim Delay")
        ax.grid(True)
        ax.legend()

    b64 = _to_b64_png(fig)
    interp = interpret_graph(df)

    return {
        "image_base64": b64,
        "image_data_url": _data_url(b64),
        "legend": {"0": "Normal", "1": "Anomaly"},
        "insights": interp["insights"],
        "stats": interp["stats"],
    }


def _token_vs_aadhaar_scatter(df: pd.DataFrame, show_full_aadhaar: bool = False) -> str:
    """
    Token vs Aadhaar pattern (x = token order label, y = Aadhaar category index).
    - Avoids StrCategoryConverter errors by using numeric y positions and setting tick labels.
    - Highlights anomalies with 'x' marker and annotates each anomaly with tokenId (token "name").
    """
    # Order by time so the x-axis shows a "timeline" feeling
    dfx = df.sort_values("issuedTime").reset_index(drop=True).copy()
    dfx["tokenId_str"] = dfx["tokenId"].astype(str)

    # Mask or keep Aadhaar as requested
    if show_full_aadhaar:
        dfx["aadhaar_label"] = dfx["aadhaar"].astype(str)
    else:
        dfx["aadhaar_label"] = dfx["aadhaar"].apply(lambda a: _mask_aadhaar(a, visible=4))

    # Build a stable list of categories: each Aadhaar label -> integer position
    labels = sorted(dfx["aadhaar_label"].unique())
    label_to_idx = {lab: i for i, lab in enumerate(labels)}
    dfx["aadhaar_pos"] = dfx["aadhaar_label"].map(label_to_idx)

    # X: token index & a human-friendly label (tokenId)
    dfx["x_pos"] = range(1, len(dfx) + 1)  # 1..N across the timeline

    # Ensure ml_anomaly exists
    if "ml_anomaly" not in dfx.columns:
        features = dfx[["rationAmount", "claimDelay", "oddHour", "expiredUsage"]].values
        model = IForest(random_state=42)
        model.fit(features)
        dfx["ml_anomaly"] = model.predict(features)

    fig, ax = plt.subplots(figsize=(10, 6))
    if dfx.empty:
        ax.text(0.5, 0.5, "No data", ha="center", va="center")
    else:
        # Normal points
        nm = dfx["ml_anomaly"] == 0
        ax.scatter(dfx.loc[nm, "x_pos"], dfx.loc[nm, "aadhaar_pos"], alpha=0.7, label="Normal")

        # Anomaly points (marker='x') and annotate with tokenId
        am = dfx["ml_anomaly"] == 1
        ax.scatter(dfx.loc[am, "x_pos"], dfx.loc[am, "aadhaar_pos"], alpha=0.9, marker="x", label="Anomaly")

        # Annotate tokenId for anomaly points (to "display the token name")
        for _, r in dfx.loc[am, ["x_pos", "aadhaar_pos", "tokenId_str"]].iterrows():
            ax.annotate(r["tokenId_str"], (r["x_pos"], r["aadhaar_pos"]),
                        xytext=(5, 4), textcoords="offset points", fontsize=8)

        # X ticks: show sparse labels to avoid clutter (every Nth)
        N = len(dfx)
        step = max(1, N // 12)  # show at most ~12 labels
        xticks = list(range(1, N + 1, step))
        xtick_labels = [dfx.loc[i - 1, "tokenId_str"] for i in xticks]  # i is 1-based
        ax.set_xticks(xticks)
        ax.set_xticklabels(xtick_labels, rotation=45, ha="right")

        # Y ticks: numeric positions with Aadhaar labels
        ax.set_yticks(range(len(labels)))
        ax.set_yticklabels(labels)

        ax.set_xlabel("Token timeline (by issuedTime) — labeled with tokenId")
        ax.set_ylabel("Aadhaar")
        ax.set_title("Token vs Aadhaar Pattern (anomalies marked & annotated)")
        ax.grid(True, axis="y")
        ax.legend()

    return _to_b64_png(fig)


def _anomaly_type_bar(rule_anomalies: List[Dict[str, Any]]) -> Tuple[str, Dict[str, int]]:
    """
    Bar chart of rule-based anomaly type counts (by reason text).
    Returns (image_b64, counts_dict).
    """
    # Flatten reasons
    all_reasons: List[str] = []
    for item in rule_anomalies:
        all_reasons.extend(item.get("reasons", []))
    counts = Counter(all_reasons)

    # If there are many, show the top-K on the chart
    K = 15
    most_common = counts.most_common(K)

    fig, ax = plt.subplots(figsize=(10, 6))
    if not most_common:
        ax.text(0.5, 0.5, "No rule-based anomalies", ha="center", va="center")
        ax.set_title("Anomaly Types (rule-based)")
    else:
        labels, values = zip(*most_common)
        ax.bar(range(len(values)), values)  # default color/style
        ax.set_xticks(range(len(labels)))
        ax.set_xticklabels(labels, rotation=30, ha="right")
        ax.set_ylabel("Count")
        ax.set_title(f"Anomaly Types (Top {K})")
        ax.grid(axis="y")

    return _to_b64_png(fig), dict(counts)


# ------------------- SCHEDULER -------------------
def scheduled_job():
    global latest_df, latest_results
    df = fetch_tokens_data()
    results = run_anomaly_detection(df)
    latest_df, latest_results = df, results
    logging.info(f"[Scheduler] Anomaly detection updated at {datetime.datetime.now()}")


scheduler = BackgroundScheduler()
scheduler.add_job(scheduled_job, "interval", hours=3)
if not scheduler.running:
    scheduler.start()
# Run once on startup
scheduled_job()


# ------------------- API ROUTES -------------------
@app.get("/")
def root():
    return {"message": "Ration Anomaly API is running 🚀"}


@app.get("/anomalies")
def anomalies(limit: int = 10):
    df = fetch_tokens_data()
    result = run_anomaly_detection(df)
    return {
        "total_records": len(df),
        "ml_anomalies": result["ml_detected"],
        "rule_based_anomalies": result["rule_detected"],
        "anomaly_details": result["details"][:limit],
    }


@app.get("/graph")
def get_graph():
    """
    Returns JSON:
      {
        image_data_url: "data:image/png;base64,...",
        image_base64: "....",   // legacy
        legend: {"0":"Normal","1":"Anomaly"},
        insights: [...],
        stats: {...}
      }
    🔗 Next.js can just <img src={image_data_url} />
    """
    global latest_df
    if latest_df is None:
        df = fetch_tokens_data()
        _ = run_anomaly_detection(df)
        latest_df = df
    payload = generate_main_scatter_payload(latest_df.copy())
    return payload


@app.get("/latest")
def get_latest_results():
    """
    Returns the last scheduled run results plus a fresh interpretation of the current df.
    """
    global latest_df, latest_results
    if latest_results is None or latest_df is None:
        return {"message": "No scheduled results yet"}
    interp = interpret_graph(latest_df)
    return {
        **latest_results,
        "graph_interpretation": {
            "insights": interp["insights"],
            "stats": interp["stats"],
        },
    }


@app.get("/graphs/patterns")
def get_patterns(show_full_aadhaar: bool = False):
    """
    Returns JSON combining:
      - token_vs_aadhaar_image_data_url: "data:image/png;base64,..."
      - anomaly_bar_image_data_url:      "data:image/png;base64,..."
      - anomaly_type_counts:             {reason: count, ...}

    ⚙️ Frontend usage (both Option A/B work):
      fetch('/fastapi/graphs/patterns')             // if using Next rewrite proxy
      // or
      fetch(`${process.env.NEXT_PUBLIC_API_BASE}/graphs/patterns`)
    """
    global latest_df
    if latest_df is None:
        df = fetch_tokens_data()
        _ = run_anomaly_detection(df)
        latest_df = df

    # Build rule-based anomalies for the bar chart
    rule_details = detect_rule_based_anomalies(latest_df)
    bar_b64, counts = _anomaly_type_bar(rule_details)

    # Build token vs aadhaar pattern (annotate tokenId on anomaly points)
    patt_b64 = _token_vs_aadhaar_scatter(latest_df.copy(), show_full_aadhaar=show_full_aadhaar)

    return {
        "token_vs_aadhaar_image_data_url": _data_url(patt_b64),
        "anomaly_bar_image_data_url": _data_url(bar_b64),
        "anomaly_type_counts": counts,
    }


# ------------------- (optional) STANDALONE RUN -------------------
# Use: python main.py
# Then open http://127.0.0.1:8000/docs
if __name__ == "__main__":
    import uvicorn
    # 🔧 Change host/port if needed. If Next runs in Docker, expose 0.0.0.0.
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
