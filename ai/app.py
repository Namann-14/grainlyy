import gradio as gr
import requests
import json
import base64
from io import BytesIO
from PIL import Image
import uvicorn
import threading
import pandas as pd
import datetime
import time
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, HTMLResponse
from main import fetch_tokens_data, run_anomaly_detection, generate_main_scatter_payload, detect_rule_based_anomalies, _anomaly_type_bar, _token_vs_aadhaar_scatter, _data_url, interpret_graph

# Create a new FastAPI app that will be exposed through Gradio
api_app = FastAPI(title="Blockchain Ration Anomaly API")

# Enhanced CORS for admin dashboard access
api_app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for admin dashboard
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global storage for caching
latest_df = None
latest_results = None

def update_cache():
    """Update the global cache with latest data"""
    global latest_df, latest_results
    df = fetch_tokens_data()
    results = run_anomaly_detection(df)
    latest_df, latest_results = df, results
    return df, results

# API Routes that will be accessible via Gradio
@api_app.get("/graph")
def get_graph():
    """Main anomaly scatter plot"""
    global latest_df
    if latest_df is None:
        df, _ = update_cache()
    else:
        df = latest_df
    payload = generate_main_scatter_payload(df.copy())
    return payload

@api_app.get("/anomalies")
def get_anomalies(limit: int = 10):
    """Detailed anomaly list"""
    df, result = update_cache()
    return {
        "total_records": len(df),
        "ml_anomalies": result["ml_detected"],
        "rule_based_anomalies": result["rule_detected"],
        "anomaly_details": result["details"][:limit],
    }

@api_app.get("/graphs/patterns")
def get_patterns(show_full_aadhaar: bool = False):
    """Pattern analysis charts"""
    global latest_df
    if latest_df is None:
        df, _ = update_cache()
    else:
        df = latest_df
    
    rule_details = detect_rule_based_anomalies(df)
    bar_b64, counts = _anomaly_type_bar(rule_details)
    patt_b64 = _token_vs_aadhaar_scatter(df.copy(), show_full_aadhaar=show_full_aadhaar)
    
    return {
        "token_vs_aadhaar_image_data_url": _data_url(patt_b64),
        "anomaly_bar_image_data_url": _data_url(bar_b64),
        "anomaly_type_counts": counts,
    }

@api_app.get("/latest")
def get_latest():
    """Latest analysis results"""
    global latest_df, latest_results
    if latest_results is None or latest_df is None:
        df, results = update_cache()
    else:
        df, results = latest_df, latest_results
    
    interp = interpret_graph(df)
    return {
        **results,
        "graph_interpretation": {
            "insights": interp["insights"],
            "stats": interp["stats"],
        },
    }

# Gradio functions for the interface
def get_anomaly_analysis():
    """Get comprehensive anomaly analysis for Gradio interface"""
    try:
        # Fetch data and run analysis
        df, results = update_cache()
        
        # Generate main graph
        graph_data = generate_main_scatter_payload(df.copy())
        
        # Convert base64 to PIL Image for Gradio
        image_data = graph_data['image_data_url'].split(',')[1]
        image_bytes = base64.b64decode(image_data)
        main_image = Image.open(BytesIO(image_bytes))
        
        # Get rule-based anomalies for details
        rule_anomalies = detect_rule_based_anomalies(df)
        
        # Generate anomaly type bar chart
        bar_b64, counts = _anomaly_type_bar(rule_anomalies)
        bar_image_bytes = base64.b64decode(bar_b64)
        bar_image = Image.open(BytesIO(bar_image_bytes))
        
        # Generate pattern scatter
        pattern_b64 = _token_vs_aadhaar_scatter(df.copy(), show_full_aadhaar=False)
        pattern_image_bytes = base64.b64decode(pattern_b64)
        pattern_image = Image.open(BytesIO(pattern_image_bytes))
        
        # Format insights
        insights_text = "\n".join([f"• {insight}" for insight in graph_data['insights']])
        
        # Format anomaly details
        anomaly_details = []
        for anomaly in rule_anomalies[:10]:  # Show top 10
            details = f"**Token {anomaly['tokenId']}** (Aadhaar: {anomaly['aadhaar']})\n"
            details += f"Issued: {anomaly['issuedAt']}\n"
            if anomaly['claimAt']:
                details += f"Claimed: {anomaly['claimAt']}\n"
            details += f"Issues: {', '.join(anomaly['reasons'])}\n"
            anomaly_details.append(details)
        
        anomaly_text = "\n" + "="*50 + "\n".join(anomaly_details) if anomaly_details else "No anomalies detected!"
        
        # Format statistics
        stats = graph_data['stats']
        stats_text = f"""
📊 **Analysis Statistics:**
• Total Records: {stats['total_points']}
• ML Anomalies: {stats['ml_anomalies']}
• Rule-based Anomalies: {len(rule_anomalies)}
• Anomaly Rate: {stats['anomaly_rate']:.1%}
• Avg Claim Delay: {stats.get('avg_claim_delay_sec', 0):.1f} seconds
"""
        
        return main_image, bar_image, pattern_image, insights_text, anomaly_text, stats_text
        
    except Exception as e:
        error_msg = f"Error during analysis: {str(e)}"
        # Return placeholder images and error message
        placeholder = Image.new('RGB', (400, 300), color='lightgray')
        return placeholder, placeholder, placeholder, error_msg, error_msg, error_msg

def get_live_blockchain_data():
    """Get current blockchain statistics"""
    try:
        df = fetch_tokens_data()
        total_tokens = len(df)
        claimed_tokens = df['isClaimed'].sum() if not df.empty else 0
        expired_tokens = df['isExpired'].sum() if not df.empty else 0
        
        recent_tokens = df[df['issuedTime'] > (df['issuedTime'].max() - pd.Timedelta(days=7))] if not df.empty else pd.DataFrame()
        recent_count = len(recent_tokens)
        
        blockchain_stats = f"""
🔗 **Live Blockchain Data:**
• Total Tokens: {total_tokens}
• Claimed Tokens: {claimed_tokens}
• Expired Tokens: {expired_tokens}
• Recent Tokens (7 days): {recent_count}
• Last Updated: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
"""
        return blockchain_stats
    except Exception as e:
        return f"❌ Blockchain connection error: {str(e)}"

def api_endpoint_handler(endpoint: str, params: str = ""):
    """Handle API endpoint calls through Gradio"""
    try:
        if endpoint == "/graph":
            result = get_graph()
        elif endpoint == "/anomalies":
            limit = 10
            if params and params.isdigit():
                limit = int(params)
            result = get_anomalies(limit=limit)
        elif endpoint == "/graphs/patterns":
            result = get_patterns()
        elif endpoint == "/latest":
            result = get_latest()
        else:
            return {"error": "Invalid endpoint"}
        
        return json.dumps(result, indent=2, default=str)
    except Exception as e:
        return f"Error: {str(e)}"

# Create Gradio interface
with gr.Blocks(title="🔍 Blockchain Ration Anomaly Detection", theme=gr.themes.Soft()) as interface:
    gr.Markdown("""
    # 🔍 Blockchain Ration Anomaly Detection System
    
    **Advanced AI-powered anomaly detection for blockchain-based ration distribution networks**
    
    This system analyzes real-time blockchain data from Polygon Amoy testnet to detect fraudulent patterns in ration distribution.
    
    ## 🔗 API Endpoints for Admin Dashboard
    
    **Use the API section below to test endpoints that your admin dashboard can call**
    
    ### Available Endpoints:
    
    | Endpoint | Description | Parameters |
    |----------|-------------|------------|
    | `/graph` | Main anomaly scatter plot | None |
    | `/anomalies` | Detailed anomaly list | limit (number) |
    | `/graphs/patterns` | Pattern analysis charts | None |
    | `/latest` | Latest analysis results | None |
    
    ### 📊 How to use in your Admin Dashboard:
    
    Since Hugging Face Spaces doesn't expose FastAPI endpoints directly, use the API tester below to get the JSON responses, then implement similar logic in your admin dashboard by copying the functions from main.py.
    """)
    
    with gr.Tab("📊 Interactive Analysis"):
        with gr.Row():
            refresh_btn = gr.Button("🔄 Run Fresh Analysis", variant="primary", size="lg")
            blockchain_btn = gr.Button("🔗 Get Live Blockchain Stats", variant="secondary")
        
        with gr.Row():
            blockchain_stats = gr.Textbox(
                label="📡 Live Blockchain Statistics",
                lines=6,
                interactive=False
            )
        
        with gr.Row():
            insights_output = gr.Textbox(
                label="🎯 Key Insights",
                lines=8,
                interactive=False
            )
            stats_output = gr.Textbox(
                label="📈 Analysis Statistics", 
                lines=8,
                interactive=False
            )
        
        with gr.Row():
            main_graph = gr.Image(
                label="📊 Main Anomaly Detection (Ration Amount vs Claim Delay)",
                type="pil"
            )
        
        with gr.Row():
            with gr.Column():
                pattern_graph = gr.Image(
                    label="🔍 Token vs Aadhaar Patterns",
                    type="pil"
                )
            with gr.Column():
                anomaly_bar_graph = gr.Image(
                    label="📋 Anomaly Types Distribution", 
                    type="pil"
                )
        
        with gr.Row():
            anomaly_details = gr.Textbox(
                label="🚨 Detailed Anomaly Reports",
                lines=15,
                interactive=False
            )
    
    with gr.Tab("🔌 API Tester for Admin Dashboard"):
        gr.Markdown("""
        ## 🔧 Test API Endpoints
        
        Use this section to test the API responses that your admin dashboard would receive.
        Copy the JSON responses to implement in your dashboard.
        """)
        
        with gr.Row():
            endpoint_dropdown = gr.Dropdown(
                choices=["/graph", "/anomalies", "/graphs/patterns", "/latest"],
                value="/graph",
                label="Select API Endpoint"
            )
            params_input = gr.Textbox(
                label="Parameters (e.g., '20' for anomalies limit)",
                placeholder="Optional parameters",
                value=""
            )
        
        test_api_btn = gr.Button("🧪 Test API Endpoint", variant="primary")
        
        api_response = gr.Code(
            label="📄 JSON Response (Copy this for your admin dashboard)",
            language="json",
            lines=20
        )
        
        gr.Markdown("""
        ### 💡 Implementation Guide for Admin Dashboard:
        
        1. **Copy the functions** from `main.py` to your admin dashboard backend
        2. **Use the JSON structure** shown above in your dashboard
        3. **For images**: The base64 data can be used directly in `<img>` tags
        4. **For real-time updates**: Call these functions periodically in your dashboard
        
        ### 🔗 Example Integration:
        
        ```python
        # In your admin dashboard backend
        from main import fetch_tokens_data, run_anomaly_detection, generate_main_scatter_payload
        
        def get_dashboard_data():
            df = fetch_tokens_data()
            results = run_anomaly_detection(df)
            graph_data = generate_main_scatter_payload(df.copy())
            
            return {
                'anomaly_count': results['ml_detected'],
                'chart_image': graph_data['image_data_url'],
                'insights': graph_data['insights']
            }
        ```
        """)
    
    # Event handlers
    refresh_btn.click(
        fn=get_anomaly_analysis,
        outputs=[main_graph, anomaly_bar_graph, pattern_graph, insights_output, anomaly_details, stats_output]
    )
    
    blockchain_btn.click(
        fn=get_live_blockchain_data,
        outputs=[blockchain_stats]
    )
    
    test_api_btn.click(
        fn=api_endpoint_handler,
        inputs=[endpoint_dropdown, params_input],
        outputs=[api_response]
    )
    
    # Load initial data
    interface.load(
        fn=get_anomaly_analysis,
        outputs=[main_graph, anomaly_bar_graph, pattern_graph, insights_output, anomaly_details, stats_output]
    )
    
    interface.load(
        fn=get_live_blockchain_data,
        outputs=[blockchain_stats]
    )

# Launch the interface
if __name__ == "__main__":
    print("🚀 Starting Blockchain Ration Anomaly Detection System...")
    print("📡 Gradio interface with API testing capabilities...")
    print("🔌 API endpoints available through Gradio interface...")
    
    interface.launch(
        server_name="0.0.0.0",
        server_port=7860,
        share=False,
        show_error=True
    )

def get_anomaly_analysis():
    """Get comprehensive anomaly analysis"""
    try:
        # Fetch data and run analysis
        df = fetch_tokens_data()
        results = run_anomaly_detection(df)
        
        # Generate main graph
        graph_data = generate_main_scatter_payload(df.copy())
        
        # Convert base64 to PIL Image for Gradio
        image_data = graph_data['image_data_url'].split(',')[1]
        image_bytes = base64.b64decode(image_data)
        main_image = Image.open(BytesIO(image_bytes))
        
        # Get rule-based anomalies for details
        rule_anomalies = detect_rule_based_anomalies(df)
        
        # Generate anomaly type bar chart
        bar_b64, counts = _anomaly_type_bar(rule_anomalies)
        bar_image_bytes = base64.b64decode(bar_b64)
        bar_image = Image.open(BytesIO(bar_image_bytes))
        
        # Generate pattern scatter
        pattern_b64 = _token_vs_aadhaar_scatter(df.copy(), show_full_aadhaar=False)
        pattern_image_bytes = base64.b64decode(pattern_b64)
        pattern_image = Image.open(BytesIO(pattern_image_bytes))
        
        # Format insights
        insights_text = "\n".join([f"• {insight}" for insight in graph_data['insights']])
        
        # Format anomaly details
        anomaly_details = []
        for anomaly in rule_anomalies[:10]:  # Show top 10
            details = f"**Token {anomaly['tokenId']}** (Aadhaar: {anomaly['aadhaar']})\n"
            details += f"Issued: {anomaly['issuedAt']}\n"
            if anomaly['claimAt']:
                details += f"Claimed: {anomaly['claimAt']}\n"
            details += f"Issues: {', '.join(anomaly['reasons'])}\n"
            anomaly_details.append(details)
        
        anomaly_text = "\n" + "="*50 + "\n".join(anomaly_details) if anomaly_details else "No anomalies detected!"
        
        # Format statistics
        stats = graph_data['stats']
        stats_text = f"""
📊 **Analysis Statistics:**
• Total Records: {stats['total_points']}
• ML Anomalies: {stats['ml_anomalies']}
• Rule-based Anomalies: {len(rule_anomalies)}
• Anomaly Rate: {stats['anomaly_rate']:.1%}
• Avg Claim Delay: {stats.get('avg_claim_delay_sec', 0):.1f} seconds
"""
        
        return main_image, bar_image, pattern_image, insights_text, anomaly_text, stats_text
        
    except Exception as e:
        error_msg = f"Error during analysis: {str(e)}"
        # Return placeholder images and error message
        placeholder = Image.new('RGB', (400, 300), color='lightgray')
        return placeholder, placeholder, placeholder, error_msg, error_msg, error_msg

def get_live_blockchain_data():
    """Get current blockchain statistics"""
    try:
        df = fetch_tokens_data()
        total_tokens = len(df)
        claimed_tokens = df['isClaimed'].sum() if not df.empty else 0
        expired_tokens = df['isExpired'].sum() if not df.empty else 0
        
        recent_tokens = df[df['issuedTime'] > (df['issuedTime'].max() - pd.Timedelta(days=7))] if not df.empty else pd.DataFrame()
        recent_count = len(recent_tokens)
        
        blockchain_stats = f"""
🔗 **Live Blockchain Data:**
• Total Tokens: {total_tokens}
• Claimed Tokens: {claimed_tokens}
• Expired Tokens: {expired_tokens}
• Recent Tokens (7 days): {recent_count}
• Last Updated: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
"""
        return blockchain_stats
    except Exception as e:
        return f"❌ Blockchain connection error: {str(e)}"

# Create Gradio interface
with gr.Blocks(title="� Blockchain Ration Anomaly Detection", theme=gr.themes.Soft()) as interface:
    gr.Markdown("""
    # 🔍 Blockchain Ration Anomaly Detection System
    
    **Advanced AI-powered anomaly detection for blockchain-based ration distribution networks**
    
    This system analyzes real-time blockchain data from Polygon Amoy testnet to detect fraudulent patterns in ration distribution.
    
    ## 🔗 Admin Dashboard API Endpoints
    
    **Base URL for API calls**: `https://huggingface.co/spaces/Jatin2435/ration-anomaly-detection`
    
    ### Available Endpoints for Your Admin Dashboard:
    
    | Endpoint | Description | Response Format |
    |----------|-------------|-----------------|
    | `/graph` | Main anomaly scatter plot | JSON with base64 image + insights |
    | `/anomalies` | Detailed anomaly list | JSON with anomaly details |
    | `/anomalies?limit=50` | Anomaly list with custom limit | JSON with anomaly details |
    | `/graphs/patterns` | Pattern analysis charts | JSON with multiple base64 images |
    | `/latest` | Latest analysis results | JSON with combined results |
    | `/docs` | API documentation | Interactive Swagger docs |
    
    ### 📊 Example API Usage for Admin Dashboard:
    
    ```javascript
    // Fetch main graph for admin dashboard
    const response = await fetch('https://huggingface.co/spaces/Jatin2435/ration-anomaly-detection/graph');
    const data = await response.json();
    
    // Use the base64 image
    document.getElementById('chart').src = data.image_data_url;
    
    // Get insights
    console.log(data.insights);
    console.log(data.stats);
    ```
    
    ```python
    # Python example for admin dashboard
    import requests
    
    # Get anomaly details
    response = requests.get('https://huggingface.co/spaces/Jatin2435/ration-anomaly-detection/anomalies?limit=100')
    data = response.json()
    
    print(f"Total anomalies: {data['rule_based_anomalies']}")
    ```
    """)
    
    with gr.Row():
        with gr.Column(scale=2):
            refresh_btn = gr.Button("🔄 Run Fresh Analysis", variant="primary", size="lg")
            blockchain_btn = gr.Button("🔗 Get Live Blockchain Stats", variant="secondary")
    
    with gr.Row():
        blockchain_stats = gr.Textbox(
            label="📡 Live Blockchain Statistics",
            lines=6,
            interactive=False
        )
    
    with gr.Row():
        insights_output = gr.Textbox(
            label="🎯 Key Insights",
            lines=8,
            interactive=False
        )
        stats_output = gr.Textbox(
            label="📈 Analysis Statistics", 
            lines=8,
            interactive=False
        )
    
    with gr.Row():
        main_graph = gr.Image(
            label="📊 Main Anomaly Detection (Ration Amount vs Claim Delay)",
            type="pil"
        )
    
    with gr.Row():
        with gr.Column():
            pattern_graph = gr.Image(
                label="🔍 Token vs Aadhaar Patterns",
                type="pil"
            )
        with gr.Column():
            anomaly_bar_graph = gr.Image(
                label="📋 Anomaly Types Distribution", 
                type="pil"
            )
    
    with gr.Row():
        anomaly_details = gr.Textbox(
            label="🚨 Detailed Anomaly Reports",
            lines=15,
            interactive=False
        )
    
    gr.Markdown("""
    ## 🔗 API Endpoints (FastAPI Backend)
    
    While this Gradio interface provides an interactive experience, the system also exposes FastAPI endpoints:
    
    - **Documentation**: Add `/docs` to the URL for FastAPI documentation
    - **Main Graph**: Add `/graph` for JSON response with base64 image
    - **Anomalies**: Add `/anomalies` for detailed anomaly data
    - **Patterns**: Add `/graphs/patterns` for pattern analysis
    - **Latest Results**: Add `/latest` for most recent analysis
    
    ## 🛡️ Privacy & Security
    - Aadhaar numbers are masked for privacy protection
    - Blockchain interactions are read-only for analysis
    - No sensitive data is stored or logged
    
    ## 🏗️ Technical Stack
    **Backend**: FastAPI, Python 3.11+ | **Blockchain**: Web3.py, Polygon Network | **ML**: PyOD, Isolation Forest | **Data**: Pandas, NumPy | **Visualization**: Matplotlib
    """)
    
    # Event handlers
    refresh_btn.click(
        fn=get_anomaly_analysis,
        outputs=[main_graph, anomaly_bar_graph, pattern_graph, insights_output, anomaly_details, stats_output]
    )
    
    blockchain_btn.click(
        fn=get_live_blockchain_data,
        outputs=[blockchain_stats]
    )
    
    # Load initial data
    interface.load(
        fn=get_anomaly_analysis,
        outputs=[main_graph, anomaly_bar_graph, pattern_graph, insights_output, anomaly_details, stats_output]
    )
    
    interface.load(
        fn=get_live_blockchain_data,
        outputs=[blockchain_stats]
    )

# Launch the interface
if __name__ == "__main__":
    print("🚀 Starting Blockchain Ration Anomaly Detection System...")
    print("📡 Gradio interface will be available shortly...")
    print("🔗 FastAPI backend running on port 8000...")
    
    interface.launch(
        server_name="0.0.0.0",
        server_port=7860,
        share=False,
        show_error=True
    )
