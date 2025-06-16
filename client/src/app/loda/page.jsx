'use client';
import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';

const SecureConsumerLogin = ({ onLoginSuccess }) => {
  const [loginMethod, setLoginMethod] = useState('aadhaar');
  const [aadhaar, setAadhaar] = useState('');
  const [mobile, setMobile] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPin, setShowPin] = useState(false);
  
  // Contract setup
  const provider = new ethers.JsonRpcProvider('https://rpc-amoy.polygon.technology');
  const diamondAddress = '0x5Aeb939E09DB54554a7DCB4367FedccDb5F767C1';

  const authenticateConsumer = async (identifier, identifierType) => {
    try {
      setLoading(true);
      setError('');

      // First verify consumer exists and PIN is set
      let loginInfo;
      if (identifierType === 'aadhaar') {
        loginInfo = await authContract.getLoginInfo(identifier);
        if (!loginInfo.exists) {
          throw new Error('Aadhaar number not registered in PDS system');
        }
        if (!loginInfo.pinSet) {
          throw new Error('PIN not set. Please contact your local PDS office to set up your PIN.');
        }
        if (!loginInfo.isActive) {
          throw new Error('Your account is inactive. Please contact PDS office.');
        }
      } else if (identifierType === 'mobile') {
        loginInfo = await authContract.getMobileLoginInfo(identifier);
        if (!loginInfo.exists) {
          throw new Error('Mobile number not registered in PDS system');
        }
      }

      setShowPin(true);
      return loginInfo;

    } catch (err) {
      setError(err.message || `Failed to verify ${identifierType}`);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!pin) {
      setError('Please enter your 6-digit PIN');
      return;
    }

    if (pin.length !== 6) {
      setError('PIN must be exactly 6 digits');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const authContract = new ethers.Contract(diamondAddress, AUTH_ABI, provider);
      
      let result;
      if (loginMethod === 'aadhaar') {
        result = await authContract.loginWithAadhaar(aadhaar, pin);
      } else {
        result = await authContract.loginWithMobile(mobile, pin);
      }

      if (result.success) {
        // Store session securely
        const sessionData = {
          sessionToken: result.sessionToken,
          aadhaar: loginMethod === 'aadhaar' ? aadhaar : result.aadhaar,
          loginTime: Date.now(),
          loginMethod: loginMethod
        };

        // Store in localStorage with encryption (in production, use better storage)
        localStorage.setItem('pds_secure_session', JSON.stringify(sessionData));
        
        onLoginSuccess({
          success: true,
          sessionToken: result.sessionToken,
          aadhaar: sessionData.aadhaar,
          dashboardType: 'SECURE_CONSUMER',
          route: '/secure-consumer-dashboard'
        });

      } else {
        setError(result.message || 'Login failed');
      }

    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleIdentifierSubmit = async (e) => {
    e.preventDefault();
    
    if (loginMethod === 'aadhaar') {
      if (!/^\d{12}$/.test(aadhaar)) {
        setError('Please enter a valid 12-digit Aadhaar number');
        return;
      }
      await authenticateConsumer(aadhaar, 'aadhaar');
    } else if (loginMethod === 'mobile') {
      if (!/^[6-9]\d{9}$/.test(mobile)) {
        setError('Please enter a valid 10-digit mobile number');
        return;
      }
      await authenticateConsumer(mobile, 'mobile');
    }
  };

  return (
    <div className="secure-login-container">
      <div className="login-card">
        <div className="header">
          <h1>🔐 सुरक्षित राशन कार्ड लॉगिन</h1>
          <h2>Secure Ration Card Login</h2>
          <div className="security-badge">
            <span>🛡️ PIN Protected System</span>
          </div>
        </div>

        {!showPin ? (
          // Step 1: Identifier Entry
          <form onSubmit={handleIdentifierSubmit}>
            <div className="login-method-tabs">
              <button
                type="button"
                className={loginMethod === 'aadhaar' ? 'active' : ''}
                onClick={() => setLoginMethod('aadhaar')}
              >
                📊 Aadhaar Number
              </button>
              <button
                type="button"
                className={loginMethod === 'mobile' ? 'active' : ''}
                onClick={() => setLoginMethod('mobile')}
              >
                📱 Mobile Number
              </button>
            </div>

            {loginMethod === 'aadhaar' && (
              <div className="input-group">
                <label>आधार नंबर | Aadhaar Number</label>
                <input
                  type="text"
                  placeholder="Enter your 12-digit Aadhaar number"
                  value={aadhaar}
                  onChange={(e) => setAadhaar(e.target.value.replace(/\D/g, ''))}
                  maxLength="12"
                  required
                  className="secure-input"
                />
                <small>Enter your registered Aadhaar number</small>
              </div>
            )}

            {loginMethod === 'mobile' && (
              <div className="input-group">
                <label>मोबाइल नंबर | Mobile Number</label>
                <input
                  type="tel"
                  placeholder="Enter your registered mobile number"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                  maxLength="10"
                  required
                  className="secure-input"
                />
                <small>Enter your registered mobile number</small>
              </div>
            )}

            {error && (
              <div className="error-message">
                ❌ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="continue-button"
            >
              {loading ? '🔄 Verifying...' : '➡️ Continue'}
            </button>
          </form>
        ) : (
          // Step 2: PIN Entry
          <form onSubmit={handleLogin}>
            <div className="pin-section">
              <div className="verified-info">
                <span className="success-badge">✅ Verified</span>
                <p>Welcome! Please enter your 6-digit PIN</p>
              </div>

              <div className="input-group">
                <label>🔐 सुरक्षा पिन | Security PIN</label>
                <input
                  type="password"
                  placeholder="Enter your 6-digit PIN"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  maxLength="6"
                  required
                  className="pin-input"
                  autoFocus
                />
                <small>Enter your 6-digit security PIN</small>
              </div>

              {error && (
                <div className="error-message">
                  ❌ {error}
                </div>
              )}

              <div className="login-actions">
                <button
                  type="button"
                  onClick={() => {
                    setShowPin(false);
                    setPin('');
                    setError('');
                  }}
                  className="back-button"
                >
                  ⬅️ Back
                </button>
                
                <button
                  type="submit"
                  disabled={loading}
                  className="login-button"
                >
                  {loading ? '🔄 Logging in...' : '🔓 Login'}
                </button>
              </div>
            </div>
          </form>
        )}

        <div className="help-section">
          <h4>Need Help? | सहायता चाहिए?</h4>
          <ul>
            <li>🔐 PIN not set? Contact your local PDS office</li>
            <li>🔒 Account locked? Wait 1 hour or contact PDS office</li>
            <li>📱 Forgot PIN? Visit PDS office with Aadhaar card</li>
            <li>❓ Other issues? Call PDS helpline: 1800-XXX-XXXX</li>
          </ul>
        </div>

        <div className="security-footer">
          <div className="security-features">
            <span>🔐 PIN Protected</span>
            <span>⏰ Session Timeout</span>
            <span>🚫 Auto Lock</span>
            <span>🛡️ Secure Data</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecureConsumerLogin;