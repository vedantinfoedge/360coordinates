import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Comprehensive console noise reduction
// Suppress expected errors and warnings that are normal application behavior

const originalError = console.error;
console.error = (...args) => {
  const errorString = args.join(' ').toLowerCase();
  
  // Filter out expected 401 errors from admin verify endpoint
  const isExpected401 = 
    (errorString.includes('/admin/auth/verify.php') || 
     errorString.includes('verify.php')) && 
    (errorString.includes('401') || errorString.includes('unauthorized'));
  
  // Filter out MSG91 widget IPBlocked errors (these are handled gracefully)
  const isMSG91IPBlocked = 
    errorString.includes('msg91') && 
    (errorString.includes('ipblocked') || 
     errorString.includes('ip blocked') ||
     errorString.includes('code: \'408\''));
  
  // Filter out CORS errors from api.db-ip.com (MSG91 widget's IP lookup)
  const isDBIPCors = 
    errorString.includes('api.db-ip.com') || 
    errorString.includes('db-ip.com') ||
    (errorString.includes('cors') && errorString.includes('x-requested-with'));
  
  // Filter out network failures from api.db-ip.com
  const isDBIPNetwork = 
    errorString.includes('api.db-ip.com') && 
    (errorString.includes('net::err_failed') || 
     errorString.includes('failed to load resource'));
  
  // Filter out otp-provider.js internal errors
  const isOTPProvider = 
    errorString.includes('otp-provider.js') && 
    (errorString.includes('401') || 
     errorString.includes('verify.php') ||
     errorString.includes('api.db-ip.com'));
  
  if (!isExpected401 && !isMSG91IPBlocked && !isDBIPCors && !isDBIPNetwork && !isOTPProvider) {
    originalError.apply(console, args);
  }
  // Silently ignore expected errors
};

const originalWarn = console.warn;
console.warn = (...args) => {
  const warnString = args.join(' ').toLowerCase();
  
  // Filter out expected 401 warnings
  const isExpected401 = 
    (warnString.includes('/admin/auth/verify.php') || 
     warnString.includes('verify.php')) && 
    (warnString.includes('401') || warnString.includes('unauthorized'));
  
  // Filter out feature_collector.js deprecated parameter warnings
  const isFeatureCollector = 
    warnString.includes('feature_collector') || 
    warnString.includes('deprecated parameters');
  
  // Filter out hCaptcha/recaptcha warnings
  const isRecaptcha = 
    warnString.includes('recaptchacompat') || 
    warnString.includes('recaptcha') ||
    warnString.includes('hcaptcha');
  
  // Filter out CORS warnings from api.db-ip.com
  const isDBIPCors = 
    warnString.includes('api.db-ip.com') || 
    warnString.includes('db-ip.com') ||
    (warnString.includes('cors') && warnString.includes('x-requested-with'));
  
  if (!isExpected401 && !isFeatureCollector && !isRecaptcha && !isDBIPCors) {
    originalWarn.apply(console, args);
  }
};

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  const errorMessage = (event.reason?.message || event.reason?.toString() || '').toLowerCase();
  
  // Filter out expected 401s
  const isExpected401 = 
    (errorMessage.includes('/admin/auth/verify.php') || 
     errorMessage.includes('verify.php')) && 
    (errorMessage.includes('401') || errorMessage.includes('unauthorized'));
  
  // Filter out CORS errors from api.db-ip.com
  const isDBIPCors = 
    errorMessage.includes('api.db-ip.com') || 
    errorMessage.includes('db-ip.com') ||
    errorMessage.includes('cors');
  
  // Filter out MSG91 IPBlocked errors
  const isMSG91IPBlocked = 
    errorMessage.includes('msg91') && 
    (errorMessage.includes('ipblocked') || errorMessage.includes('ip blocked'));
  
  if (isExpected401 || isDBIPCors || isMSG91IPBlocked) {
    event.preventDefault(); // Suppress the error
    return;
  }
});

// Suppress network errors in console (Failed to load resource)
// Note: This only affects console output, Network tab will still show requests
const originalLog = console.log;
console.log = (...args) => {
  const logString = args.join(' ').toLowerCase();
  
  // Filter out "Failed to load resource" for expected endpoints
  const isFailedResource = 
    logString.includes('failed to load resource') && 
    (logString.includes('verify.php') || 
     logString.includes('api.db-ip.com') ||
     logString.includes('401'));
  
  if (!isFailedResource) {
    originalLog.apply(console, args);
  }
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
