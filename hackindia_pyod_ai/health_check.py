#!/usr/bin/env python3
"""
Health check script for the anomaly detection system
"""
import sys
import json

def check_imports():
    """Check if all required packages are available"""
    required_packages = [
        'fastapi',
        'uvicorn', 
        'web3',
        'pandas',
        'matplotlib',
        'pyod',
        'apscheduler'
    ]
    
    missing = []
    for package in required_packages:
        try:
            __import__(package)
            print(f"✅ {package}")
        except ImportError:
            print(f"❌ {package}")
            missing.append(package)
    
    return len(missing) == 0

def check_files():
    """Check if required files exist"""
    import os
    required_files = [
        'main.py',
        'config.py', 
        'DCVToken.json',
        'index.html',
        'requirements.txt'
    ]
    
    missing = []
    for file in required_files:
        if os.path.exists(file):
            print(f"✅ {file}")
        else:
            print(f"❌ {file}")
            missing.append(file)
    
    return len(missing) == 0

def main():
    print("🔍 Health Check for Blockchain Anomaly Detection System")
    print("=" * 60)
    
    print("\n📦 Checking package imports...")
    imports_ok = check_imports()
    
    print("\n📁 Checking required files...")
    files_ok = check_files()
    
    print("\n" + "=" * 60)
    if imports_ok and files_ok:
        print("✅ All health checks passed! System is ready for deployment.")
        return 0
    else:
        print("❌ Some health checks failed. Please fix the issues above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
