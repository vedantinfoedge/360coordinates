import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../../config/api.config';
import '../style/AdminLogin.css';

// MSG91 Widget Configuration
// These should match backend config
const MSG91_WIDGET_ID = '356c786a314c303532313736';
const MSG91_AUTH_TOKEN = '481618TheXzNLL2u694bc65aP1';

// HARDCODED ADMIN MOBILE NUMBER - Only this number can login
const ADMIN_MOBILE_NUMBER = '+917888076881';

const AdminLogin = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState('mobile'); // 'mobile', 'otp'
  const [mobile, setMobile] = useState('');
  const [validatedMobile, setValidatedMobile] = useState(null); // Store validated mobile (internal use only)
  const [maskedMobile, setMaskedMobile] = useState(''); // Masked version to display
  const [validationToken, setValidationToken] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mobileLocked, setMobileLocked] = useState(false);
  const widgetInitializedRef = useRef(false); // Track if widget was already initialized

  // Helper function to load MSG91 script dynamically if not already loaded
  const loadMSG91Script = () => {
    return new Promise((resolve, reject) => {
      // Check if script is already loaded
      if (window.initSendOTP && typeof window.initSendOTP === 'function') {
        resolve();
        return;
      }

      // Check if script tag already exists
      const existingScript = document.querySelector('script[src*="otp-provider.js"]');
      if (existingScript) {
        // Script tag exists, wait for it to load
        existingScript.addEventListener('load', () => resolve());
        existingScript.addEventListener('error', () => reject(new Error('Failed to load MSG91 script')));
        return;
      }

      // Load script dynamically
      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.src = 'https://verify.msg91.com/otp-provider.js';
      script.async = true;
      
      script.onload = () => {
        // Wait a bit more for the function to be available
        setTimeout(() => {
          if (window.initSendOTP && typeof window.initSendOTP === 'function') {
            resolve();
          } else {
            reject(new Error('MSG91 script loaded but initSendOTP function not available'));
          }
        }, 100);
      };
      
      script.onerror = () => {
        reject(new Error('Failed to load MSG91 script'));
      };
      
      document.head.appendChild(script);
    });
  };

  // Helper function to normalize mobile number for comparison (remove spaces, dashes, etc.)
  const normalizeMobile = (mobileNumber) => {
    if (!mobileNumber) return '';
    // Remove all non-digit characters except +
    return mobileNumber.replace(/[^0-9+]/g, '');
  };

  // Helper function to mask mobile number
  const maskMobileNumber = (mobileNumber) => {
    if (!mobileNumber) return '';
    const cleaned = mobileNumber.replace(/[^0-9+]/g, '');
    if (cleaned.length >= 6) {
      // Show first 4 chars and last 4 chars, mask the middle
      const start = cleaned.substring(0, 4);
      const end = cleaned.substring(cleaned.length - 4);
      return start + '****' + end;
    }
    return '****' + cleaned.substring(Math.max(0, cleaned.length - 4));
  };

  // Check if already authenticated
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/admin/auth/verify.php`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        // 401 is expected when not authenticated - handle silently
        if (response.status === 401) {
          // Not authenticated, continue to login page
          return;
        }

        // Check if response is JSON before parsing
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json') && response.ok) {
          const data = await response.json();
          if (data.success && data.data && data.data.admin) {
            navigate('/admin/dashboard', { replace: true });
          }
        }
      } catch (err) {
        // Not authenticated or network error, continue to login
        // Silently ignore - 401 is expected behavior
      }
    };

    checkAuth();
  }, [navigate]);

  // Step 1: Validate mobile number against hardcoded admin number (frontend-only validation)
  const handleValidateMobile = (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!mobile || mobile.trim().length === 0) {
      setError('Please enter your mobile number');
      setLoading(false);
      return;
    }

    // Normalize both mobile numbers for comparison
    const enteredMobile = normalizeMobile(mobile.trim());
    const adminMobile = normalizeMobile(ADMIN_MOBILE_NUMBER);

    // Compare the normalized mobile numbers
    if (enteredMobile !== adminMobile) {
      // Mobile number doesn't match - show error popup
      setError('Invalid mobile number. Access denied.');
      setLoading(false);
      return;
    }

    // Mobile number matches - proceed to OTP widget
    // Generate a simple local validation token (not used by backend, just for local state)
    const localToken = 'local_' + Date.now();
    setValidationToken(localToken);
    
    // Store the validated mobile (keep it for internal use but don't display it)
    const mobileToStore = mobile.trim();
    setValidatedMobile(mobileToStore);
    
    // Create masked version for display only
    setMaskedMobile(maskMobileNumber(mobileToStore));
    
    // Clear the actual mobile number from the input field
    setMobile('');
    setMobileLocked(true); // Lock mobile number
    setStep('otp');
    setLoading(false);
    
    // Widget will be initialized by useEffect when step changes to 'otp'
  };

  // Helper function to wait for MSG91 script to load
  const waitForMSG91Script = (maxAttempts = 20, delay = 200) => {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      
      const checkScript = () => {
        attempts++;
        
        if (window.initSendOTP && typeof window.initSendOTP === 'function') {
          resolve(true);
          return;
        }
        
        if (attempts >= maxAttempts) {
          reject(new Error('MSG91 script failed to load after multiple attempts'));
          return;
        }
        
        setTimeout(checkScript, delay);
      };
      
      checkScript();
    });
  };

  // Step 2: Initialize MSG91 Widget (after frontend validation)
  const initializeMSG91Widget = useCallback(async (mobileNumber = null) => {
    // Prevent double initialization
    if (widgetInitializedRef.current) {
      return;
    }

    // Try to load MSG91 script if not already loaded
    try {
      // First try to load script dynamically
      await loadMSG91Script();
    } catch (loadError) {
      console.warn('Failed to load MSG91 script dynamically, waiting for existing script:', loadError);
      // If dynamic load fails, wait for existing script to load
      try {
        await waitForMSG91Script(20, 200); // Wait up to 4 seconds (20 * 200ms)
      } catch (waitError) {
        console.error('MSG91 script loading error:', waitError);
        setError('MSG91 widget is not loaded. Please refresh the page and try again.');
        widgetInitializedRef.current = false;
        return;
      }
    }

    // Final check
    if (!window.initSendOTP || typeof window.initSendOTP !== 'function') {
      setError('MSG91 widget is not loaded. Please refresh the page and try again.');
      widgetInitializedRef.current = false;
      return;
    }

    // Use passed mobile number or fallback to state
    const mobileToUse = mobileNumber || validatedMobile;

    if (!mobileToUse) {
      setError('Mobile number validation missing. Please restart the login process.');
      return;
    }

    // Mark as initialized
    widgetInitializedRef.current = true;
    
    // Format mobile for MSG91 (remove + and spaces)
    const formattedMobile = mobileToUse.replace(/[^0-9]/g, '');
    // MSG91 expects format: 91XXXXXXXXXX (country code + number, no + sign)
    const msg91Mobile = formattedMobile.startsWith('91') ? formattedMobile : '91' + formattedMobile.slice(-10);

    try {
      const configuration = {
        widgetId: MSG91_WIDGET_ID,
        tokenAuth: MSG91_AUTH_TOKEN,
        identifier: msg91Mobile, // Mobile number for OTP
        success: async (widgetData) => {
          // Widget OTP verification successful
          console.log('MSG91 Widget Success:', widgetData);
          
          // Extract widget token
          let widgetToken = null;
          if (typeof widgetData === 'string') {
            widgetToken = widgetData;
          } else if (widgetData?.token) {
            widgetToken = widgetData.token;
          } else if (widgetData?.verificationToken) {
            widgetToken = widgetData.verificationToken;
          } else if (widgetData?.data?.token) {
            widgetToken = widgetData.data.token;
          } else {
            widgetToken = JSON.stringify(widgetData);
          }

          // Step 3: Verify OTP with backend
          await handleVerifyOTP(widgetToken);
        },
        failure: (error) => {
          // Extract error message from various possible formats
          let errorMessage = 'OTP verification failed. Please try again.';
          
          if (error) {
            if (typeof error === 'string') {
              errorMessage = error;
            } else if (error.message) {
              errorMessage = error.message;
            } else if (error.error) {
              errorMessage = typeof error.error === 'string' ? error.error : error.error.message || errorMessage;
            } else if (error.reason) {
              errorMessage = error.reason;
            } else if (error.description) {
              errorMessage = error.description;
            } else if (typeof error === 'object') {
              // Try to stringify and extract meaningful info
              try {
                const errorStr = JSON.stringify(error);
                if (errorStr !== '{}') {
                  errorMessage = `OTP verification failed: ${errorStr}`;
                }
              } catch (e) {
                errorMessage = error.toString() || errorMessage;
              }
            } else {
              errorMessage = error.toString() || errorMessage;
            }
          }
          
          // Don't log IPBlocked errors (they're expected and handled gracefully)
          const isIPBlocked = 
            errorMessage.toLowerCase().includes('ipblocked') || 
            errorMessage.toLowerCase().includes('ip blocked') ||
            (error && typeof error === 'object' && (error.code === '408' || error.message === 'IPBlocked'));
          
          if (!isIPBlocked) {
            console.error('MSG91 Widget Error:', error);
          }
          
          setError(errorMessage);
          widgetInitializedRef.current = false; // Reset on failure so user can retry
        },
      };

      window.initSendOTP(configuration);
    } catch (error) {
      console.error('Error initializing MSG91 widget:', error);
      setError('Failed to open OTP widget. Please try again.');
      widgetInitializedRef.current = false; // Reset on error
    }
  }, [validatedMobile]);

  // Step 3: Verify OTP with backend and create session
  const handleVerifyOTP = async (widgetToken) => {
    setError('');
    setLoading(true);

    if (!validatedMobile || !widgetToken) {
      setError('Missing verification data. Please restart the login process.');
      setLoading(false);
      return;
    }

    // Re-validate mobile number against hardcoded admin number before sending to backend
    const enteredMobile = normalizeMobile(validatedMobile);
    const adminMobile = normalizeMobile(ADMIN_MOBILE_NUMBER);
    
    if (enteredMobile !== adminMobile) {
      setError('Invalid mobile number. Access denied.');
      setStep('mobile');
      setValidationToken(null);
      setMobileLocked(false);
      setLoading(false);
      return;
    }

    try {
      // Send to backend for session creation (backend will still verify mobile against whitelist)
      const response = await fetch(`${API_BASE_URL}/admin/auth/verify-otp.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          validationToken: validationToken || 'frontend_validated', // Use local token or fallback
          mobile: validatedMobile, // Use validated mobile
          widgetToken: widgetToken,
        }),
      });

      // Check response status first
      if (!response.ok) {
        // Try to get error message from response
        let errorMessage = 'OTP verification failed. Please try again.';
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            errorMessage = errorData.message || errorMessage;
          } else {
            const text = await response.text();
            if (text) {
              // Try to parse as JSON even if content-type is wrong
              try {
                const errorData = JSON.parse(text);
                errorMessage = errorData.message || errorMessage;
              } catch (e) {
                // Not JSON, use text or default message
                errorMessage = text.substring(0, 200) || errorMessage;
              }
            }
          }
        } catch (parseError) {
          // If we can't parse the error, use status-based message
          if (response.status === 500) {
            errorMessage = 'Server error occurred. Please try again or contact support.';
          } else if (response.status === 403) {
            errorMessage = 'Access denied. Please check your credentials.';
          }
        }
        
        setError(errorMessage);
        setStep('mobile');
        setValidationToken(null);
        setMobileLocked(false);
        setLoading(false);
        return;
      }

      // Check if response is JSON before parsing
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response:', text.substring(0, 500));
        setError('Server returned an invalid response. Please try again or contact support.');
        setStep('mobile');
        setValidationToken(null);
        setMobileLocked(false);
        setLoading(false);
        return;
      }

      // Try to parse JSON, handle empty responses
      let data;
      try {
        const text = await response.text();
        if (!text || text.trim() === '') {
          setError('Server returned an empty response. Please try again.');
          setStep('mobile');
          setValidationToken(null);
          setMobileLocked(false);
          setLoading(false);
          return;
        }
        data = JSON.parse(text);
      } catch (jsonError) {
        console.error('JSON parse error:', jsonError);
        setError('Server returned an invalid response. Please try again or contact support.');
        setStep('mobile');
        setValidationToken(null);
        setMobileLocked(false);
        setLoading(false);
        return;
      }

      if (data.success) {
        // Login successful - session created via HTTP-only cookie
        // Clear loading state
        setLoading(false);
        
        // Redirect immediately - session is already created and will be verified by dashboard
        // No need to verify immediately as it can cause race conditions
        console.log('Admin login successful, redirecting to dashboard');
        navigate('/admin/dashboard', { replace: true });
      } else {
        setError(data.message || 'OTP verification failed. Please try again.');
        // Reset to mobile step on failure
        setStep('mobile');
        setValidationToken(null);
        setMobileLocked(false);
      }
    } catch (err) {
      console.error('OTP verification error:', err);
      if (err.message && err.message.includes('JSON')) {
        setError('Server returned an invalid response. The API endpoint may not be available.');
      } else {
        setError('Connection error. Please check your internet connection and try again.');
      }
      setStep('mobile');
      setValidationToken(null);
      setMobileLocked(false);
    }

    setLoading(false);
  };

  // Handle mobile input change (only if not locked)
  const handleMobileChange = (e) => {
    if (!mobileLocked) {
      setMobile(e.target.value);
    }
  };

  // Initialize widget when step changes to OTP and validatedMobile is set
  useEffect(() => {
    if (step === 'otp' && validatedMobile && !loading && !widgetInitializedRef.current) {
      // Small delay to ensure DOM is ready and state is fully updated
      const timer = setTimeout(async () => {
        await initializeMSG91Widget(validatedMobile);
      }, 500); // Increased delay to ensure script is loaded
      return () => clearTimeout(timer);
    }
  }, [step, validatedMobile, loading, initializeMSG91Widget]); // Include all dependencies

  // Reset form
  const handleReset = () => {
    setStep('mobile');
    setMobile('');
    setValidatedMobile(null);
    setMaskedMobile('');
    setValidationToken(null);
    setMobileLocked(false);
    setError('');
    widgetInitializedRef.current = false; // Reset widget initialization flag
  };

  return (
    <div className="admin-login-page">
      <div className="admin-login-container">
        <div className="admin-login-card">
          <h1>Admin Login</h1>
          <p className="admin-login-subtitle">
            {step === 'mobile'
              ? 'Enter your mobile number to receive OTP'
              : 'Enter the OTP sent to your mobile number'}
          </p>

          {error && (
            <div className="admin-error-alert">
              {error}
            </div>
          )}

          {step === 'mobile' && (
            <form onSubmit={handleValidateMobile} className="admin-login-form">
              <div className="admin-form-group">
                <label htmlFor="mobile">Mobile Number</label>
                <input
                  type="tel"
                  id="mobile"
                  name="mobile"
                  value={mobile}
                  onChange={handleMobileChange}
                  required
                  autoComplete="tel"
                  disabled={loading || mobileLocked}
                  pattern="^\+91[6-9]\d{9}$"
                />
              </div>

              <button
                type="submit"
                className="admin-login-button"
                disabled={loading || !mobile || mobileLocked}
              >
                {loading ? 'Validating...' : 'Send OTP'}
              </button>
            </form>
          )}

          {step === 'otp' && (
            <div className="admin-login-form">
              <div className="admin-form-group">
                <label>Mobile Number Verified</label>
                <input
                  type="text"
                  value={maskedMobile || '****'}
                  disabled
                  className="admin-mobile-locked"
                  readOnly
                />
              </div>

              {loading && (
                <div className="admin-loading">
                  <p>Verifying OTP...</p>
                </div>
              )}

              <button
                type="button"
                className="admin-back-link"
                onClick={handleReset}
                disabled={loading}
              >
                ← Change Mobile Number
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
