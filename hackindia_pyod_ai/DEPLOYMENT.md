# Hugging Face Spaces Deployment Instructions

This guide will help you deploy the Blockchain Ration Anomaly Detection System to Hugging Face Spaces.

## Files to Upload

Make sure these files are in your Hugging Face Space repository:

### Core Application Files
- `app.py` - Entry point for Hugging Face Spaces
- `main.py` - FastAPI application with anomaly detection logic
- `config.py` - Configuration file (contains blockchain settings)
- `requirements.txt` - Python dependencies

### Blockchain Integration
- `DCVToken.json` - Smart contract ABI for blockchain interaction

### Frontend Interface  
- `index.html` - Web interface for the anomaly detection dashboard

### Documentation
- `README.md` - Comprehensive documentation with Hugging Face metadata
- `health_check.py` - System health verification script

### Optional Files
- `.gitignore` - Git ignore patterns
- `LICENSE` - License file (if you want to add one)

## Environment Variables to Set

In your Hugging Face Space settings, add these secrets:

1. `NEXT_PUBLIC_RPC_URL` - Your blockchain RPC URL (default: Polygon Amoy)
2. `DCVTOKEN_ADDRESS` - Your smart contract address  
3. `ADMIN_PRIVATE_KEY` - Private key for blockchain access (keep secret!)

## Deployment Methods

### Method 1: Git Push (Recommended)

```bash
# In your project directory
git init
git add .
git commit -m "Initial deployment of blockchain anomaly detection system"
git remote add origin https://huggingface.co/spaces/YOUR_USERNAME/YOUR_SPACE_NAME
git push --set-upstream origin main
```

### Method 2: Web Upload

1. Go to your Hugging Face Space
2. Click "Files" tab
3. Upload each file one by one
4. The space will automatically restart and deploy

## Post-Deployment Verification

1. Check the "Logs" tab for any errors
2. Visit your space URL to see the interface
3. Test the API endpoints:
   - `/` - Main dashboard
   - `/graph` - Anomaly visualization  
   - `/anomalies` - Detailed analysis
   - `/docs` - API documentation

## Troubleshooting

### Common Issues:

1. **Import Errors**: Check requirements.txt has all dependencies
2. **Blockchain Connection**: Verify RPC_URL and CONTRACT_ADDRESS
3. **Memory Issues**: Consider upgrading to paid hardware tier
4. **Timeout**: Large blockchain queries may timeout on free tier

### Debug Steps:

1. Check the Logs tab in your Space
2. Verify environment variables are set
3. Test locally first with `python app.py`
4. Use health_check.py to verify system status

## Space Configuration

Your README.md should have this YAML frontmatter:

```yaml
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
---
```

## Success Indicators

✅ Space shows "Running" status
✅ No errors in the Logs tab  
✅ Main interface loads at your space URL
✅ API endpoints return data
✅ Blockchain connection established
✅ Anomaly detection working

Your space will be available at:
`https://huggingface.co/spaces/YOUR_USERNAME/YOUR_SPACE_NAME`
