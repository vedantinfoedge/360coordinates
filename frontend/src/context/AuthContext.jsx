// src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { authAPI } from "../services/api.service";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // Initialize from localStorage for persistence
  const [user, setUserState] = useState(() => {
    try {
      const storedUser = localStorage.getItem("userData");
      return storedUser ? JSON.parse(storedUser) : null;
    } catch (error) {
      console.error("Error parsing stored user data:", error);
      return null;
    }
  });
  
  const [token, setTokenState] = useState(() => {
    return localStorage.getItem("authToken") || null;
  });
  
  const [loading, setLoading] = useState(true);
  const [isVerified, setIsVerified] = useState(false);
  const [verificationError, setVerificationError] = useState(null);

  // Sync user state with localStorage
  const setUser = useCallback((userData) => {
    setUserState(userData);
    if (userData) {
      localStorage.setItem("userData", JSON.stringify(userData));
    } else {
      localStorage.removeItem("userData");
    }
  }, []);

  // Sync token state with localStorage
  const setToken = useCallback((tokenValue) => {
    setTokenState(tokenValue);
    if (tokenValue) {
      localStorage.setItem("authToken", tokenValue);
    } else {
      localStorage.removeItem("authToken");
    }
  }, []);

  // Clear auth state function - single source of truth for clearing auth
  const clearAuthState = useCallback(() => {
    console.log("🔒 Clearing auth state");
    setToken(null);
    setUser(null);
    setIsVerified(false);
    setVerificationError(null);
    
    // Clear from API service
    authAPI.logout();
    
    // Clear any additional session data
    localStorage.removeItem('currentSession');
    localStorage.removeItem('registeredUser');
    
    console.log("✅ Auth state cleared");
  }, [setToken, setUser]);

  // Define logout function
  const logout = useCallback(() => {
    console.log("🔒 Logging out - clearing all auth data");
    clearAuthState();
    console.log("✅ Logout complete - all auth data cleared");
  }, [clearAuthState]);

  // Verify token with retry logic and exponential backoff
  const verifyTokenWithRetry = useCallback(async (retryCount = 0) => {
    const maxRetries = 3;
    const delays = [1000, 2000, 4000]; // 1s, 2s, 4s
    
    try {
      const response = await authAPI.verifyToken();
      
      if (response.success && response.data) {
        // Token is valid - restore session
        const storedUser = localStorage.getItem("userData");
        const storedToken = localStorage.getItem("authToken");
        
        const userData = response.data.user || (storedUser ? JSON.parse(storedUser) : null);
        const tokenData = response.data.token || storedToken;
        
        setUser(userData);
        setToken(tokenData);
        // Also sync with api.service
        authAPI.setToken(tokenData);
        authAPI.setUser(userData);
        setIsVerified(true);
        setVerificationError(null);
        console.log("✅ Session restored from persistent storage");
        return { success: true };
      } else {
        // Token is invalid - clear everything
        console.log("❌ Token verification failed - clearing session");
        clearAuthState();
        return { success: false };
      }
    } catch (error) {
      // Handle 401 errors - clear auth state
      if (error.status === 401) {
        console.error("❌ Token verification failed - 401 Unauthorized, clearing session");
        clearAuthState();
        return { success: false, error };
      }
      
      // Handle network errors - keep cached state and set error
      if (error.status === 0 || !error.status) {
        console.warn("⚠️ Token verification network error, keeping cached session:", error.message);
        
        // Restore from localStorage to ensure state is set
        const storedToken = localStorage.getItem("authToken");
        const storedUser = localStorage.getItem("userData");
        
        if (storedToken && storedUser) {
          try {
            const parsedUser = JSON.parse(storedUser);
            setUser(parsedUser);
            setToken(storedToken);
            // Also sync with api.service
            authAPI.setToken(storedToken);
            authAPI.setUser(parsedUser);
            setIsVerified(false);
            setVerificationError(error);
            console.log("✅ Restored session from localStorage after network error");
          } catch (parseError) {
            console.error("Error parsing stored user data:", parseError);
          }
        }
        
        // Retry with exponential backoff if we haven't exceeded max retries
        if (retryCount < maxRetries) {
          const delay = delays[retryCount];
          console.log(`⏳ Retrying token verification in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return verifyTokenWithRetry(retryCount + 1);
        }
        
        return { success: false, error };
      }
      
      // Other errors - clear auth state
      console.error("❌ Token verification failed with error:", error);
      clearAuthState();
      return { success: false, error };
    }
  }, [setUser, setToken, clearAuthState]);

  // Manual retry function for user-initiated retry
  const retryVerification = useCallback(async () => {
    setVerificationError(null);
    setLoading(true);
    const result = await verifyTokenWithRetry(0);
    setLoading(false);
    return result;
  }, [verifyTokenWithRetry]);

  // Auto verify token on app load/refresh to restore session
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem("authToken");
      const storedUser = localStorage.getItem("userData");
      
      // If we have a token, verify it to restore the session
      if (storedToken) {
        console.log("🔄 Verifying token on app load...");
        const result = await verifyTokenWithRetry(0);
        
        if (result.success) {
          console.log("✅ Session restored successfully");
        } else {
          console.log("❌ Session could not be restored");
        }
      } else {
        // No token found, ensure state is cleared
        if (storedUser) {
          // Clean up any orphaned user data
          localStorage.removeItem("userData");
        }
        clearAuthState();
      }
      
      setLoading(false);
    };

    initializeAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  const login = async (email, password, userType) => {
    try {
      console.log("AuthContext login called:", { email, userType });
      const response = await authAPI.login(email, password, userType);
      console.log("AuthContext login response:", response);

      if (response.success && response.data) {
        const token = response.data.token;
        const user = response.data.user;

        if (!token) {
          console.error("❌ No token received from login response");
          return { success: false, message: 'Login failed: No token received' };
        }

        if (!user) {
          console.error("❌ No user data received from login response");
          return { success: false, message: 'Login failed: No user data received' };
        }

        console.log("✅ Setting token and user in persistent storage");
        
        // ONLY save to localStorage here - this is the single source of truth
        setToken(token);
        setUser(user);
        setIsVerified(true);
        setVerificationError(null);

        // Also ensure api.service has the token (for API requests)
        authAPI.setToken(token);
        authAPI.setUser(user);

        console.log("✅ Login successful - session persisted");
        return { success: true, user, role: user.user_type };
      }

      console.error("Login response not successful:", response);
      return { success: false, message: response.message || 'Login failed' };
    } catch (error) {
      console.error("Login error in AuthContext:", error);
      const errorMessage = error.data?.message || error.message || 'Network error. Please check your connection and ensure the backend server is running.';
      return { 
        success: false, 
        message: errorMessage
      };
    }
  };

  const register = async (userData) => {
    try {
      const response = await authAPI.register(userData);
      
      if (response.success && response.data) {
        const token = response.data.token;
        const user = response.data.user;
        
        if (token && user) {
          // ONLY save to localStorage here - this is the single source of truth
          setToken(token);
          setUser(user);
          setIsVerified(true);
          setVerificationError(null);
          
          // Also ensure api.service has the token
          authAPI.setToken(token);
          authAPI.setUser(user);
        }
      }
      
      return response;
    } catch (error) {
      console.error("Register error in AuthContext:", error);
      const errorMessage = error.data?.message || error.message || 'Registration failed';
      return { 
        success: false, 
        message: errorMessage
      };
    }
  };

  const switchRole = async (targetRole) => {
    try {
      console.log("AuthContext switchRole called:", { targetRole });
      const response = await authAPI.switchRole(targetRole);
      
      if (response.success && response.data) {
        const token = response.data.token;
        const user = response.data.user;
        
        if (!token) {
          console.error("❌ No token received from switch role response");
          return { success: false, message: 'Role switch failed: No token received' };
        }
        
        if (!user) {
          console.error("❌ No user data received from switch role response");
          return { success: false, message: 'Role switch failed: No user data received' };
        }
        
        console.log("✅ Setting new token and user after role switch");
        
        // Update token and user with new role
        setToken(token);
        setUser(user);
        setIsVerified(true);
        setVerificationError(null);
        
        // Also ensure api.service has the updated token
        authAPI.setToken(token);
        authAPI.setUser(user);
        
        console.log("✅ Role switch successful - session updated");
        return { success: true, user, role: user.user_type };
      }
      
      console.error("Switch role response not successful:", response);
      return { success: false, message: response.message || 'Role switch failed' };
    } catch (error) {
      console.error("Switch role error in AuthContext:", error);
      const errorMessage = error.data?.message || error.message || 'Role switch failed. Please try again.';
      return { 
        success: false, 
        message: errorMessage
      };
    }
  };

  // Compute isAuthenticated based on user and token
  const isAuthenticated = !!(user && token);

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      loading, 
      isVerified, 
      verificationError, 
      isAuthenticated,
      login, 
      logout, 
      register,
      switchRole,
      retryVerification,
      setUser,
      setToken
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// Easy hook access
export const useAuth = () => useContext(AuthContext);

