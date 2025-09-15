---
title: Blockchain Ration Anomaly Detection
emoji: 🔍
colorFrom: blue
colorTo: purple
sdk: gradio
sdk_version: 4.0.0
app_file: app.py
pinned: false
license: mit
tags:
  - blockchain
  - anomaly-detection
  - fastapi
  - web3
  - machine-learning
  - pyod
---

# 🔍 Blockchain Ration Anomaly Detection System

An advanced anomaly detection system for blockchain-based ration distribution networks using Machine Learning and rule-based analysis.

## 🌟 Live Demo
- **Main Interface**: Visit the root URL to see the interactive dashboard
- **API Endpoints**: 
  - `/graph` - Anomaly visualization scatter plot
  - `/anomalies` - Detailed anomaly analysis
  - `/graphs/patterns` - Pattern analysis charts
  - `/latest` - Latest detection results

## 🎯 Features

### Dual Detection System
- **🤖 Machine Learning Detection**: Uses Isolation Forest (PyOD) for outlier detection
- **📋 Rule-Based Detection**: 15+ comprehensive anomaly rules including:
  - Odd hour deliveries (midnight-5am)
  - Expired token claims
  - Multiple tokens per Aadhaar per month
  - Unusually high/low ration amounts
  - Instant claims (<60 seconds)
  - Cross-location Aadhaar usage
  - And more...

### Blockchain Integration
- **Real-time Data**: Fetches live data from Polygon Amoy testnet
- **Smart Contract**: Interacts with DCVToken contract
- **Web3 Integration**: Robust blockchain connectivity

### Advanced Analytics
- **Interactive Visualizations**: Scatter plots, bar charts, pattern analysis
- **Privacy Protection**: Aadhaar number masking
- **Automated Scheduling**: Background anomaly detection every 3 hours
- **Comprehensive Reporting**: Detailed insights and statistics

## 🛠 Technology Stack

- **Backend**: FastAPI, Python 3.11+
- **Blockchain**: Web3.py, Polygon Network
- **ML/Analytics**: PyOD, Pandas, Matplotlib
- **Scheduling**: APScheduler
- **Frontend**: HTML/CSS/JavaScript with modern UI

## 📊 API Documentation

### Main Endpoints

#### `GET /`
Returns the interactive web dashboard

#### `GET /graph`
```json
{
  "image_data_url": "data:image/png;base64,...",
  "insights": ["Detected 2 ML anomalies out of 9 records..."],
  "stats": {
    "total_points": 9,
    "ml_anomalies": 2,
    "anomaly_rate": 0.2222
  }
}
```

#### `GET /anomalies`
```json
{
  "total_records": 9,
  "ml_anomalies": 2,
  "rule_based_anomalies": 5,
  "anomaly_details": [...]
}
```

#### `GET /graphs/patterns`
```json
{
  "token_vs_aadhaar_image_data_url": "data:image/png;base64,...",
  "anomaly_bar_image_data_url": "data:image/png;base64,...",
  "anomaly_type_counts": {...}
}
```

## 🔧 Configuration

The system uses environment variables for blockchain configuration:
- `NEXT_PUBLIC_RPC_URL`: Blockchain RPC endpoint
- `DCVTOKEN_ADDRESS`: Smart contract address
- `ADMIN_PRIVATE_KEY`: Private key for blockchain interactions

## 🏗 Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend UI   │◄──►│   FastAPI API    │◄──►│   Blockchain    │
│   (HTML/JS)     │    │                  │    │   (Polygon)     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │  Anomaly Engine  │
                       │  ┌─────────────┐ │
                       │  │ ML (PyOD)   │ │
                       │  │ IForest     │ │
                       │  └─────────────┘ │
                       │  ┌─────────────┐ │
                       │  │ Rule-Based  │ │
                       │  │ 15+ Rules   │ │
                       │  └─────────────┘ │
                       └──────────────────┘
```

## 🚀 Deployment

This application is deployed on Hugging Face Spaces with:
- Automatic updates from the repository
- Scalable infrastructure
- Public API access
- Interactive web interface

## 📈 Use Cases

- **Government Agencies**: Monitor ration distribution for fraud
- **NGOs**: Ensure fair distribution in relief operations
- **Researchers**: Study blockchain-based social welfare systems
- **Auditors**: Compliance checking for distribution programs

## 🔒 Privacy & Security

- Aadhaar numbers are masked in displays
- No sensitive data is logged
- Blockchain interactions are read-only for analysis
- Secure environment variable handling

## 📄 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

---

Built with ❤️ for transparent and fair blockchain-based ration distribution systems.
