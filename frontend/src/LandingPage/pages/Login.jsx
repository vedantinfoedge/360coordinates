import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, User, Building2, Home } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import ForgotPasswordModal from "../../components/ForgotPasswordModal";
import "../styles/Login.css";

const Login = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  useEffect(() => {
    document.body.classList.add("auth-page");

    return () => {
      document.body.classList.remove("auth-page");
    };
  }, []);

  // Get role from URL query parameter, default to "buyer"
  const roleFromUrl = searchParams.get("role");
  const initialUserType = roleFromUrl && ["buyer", "seller", "agent"].includes(roleFromUrl) 
    ? roleFromUrl 
    : "buyer";
  
  // Get returnUrl from query parameter to redirect back after login
  const initialReturnUrl = searchParams.get("returnUrl");

  const [userType, setUserType] = useState(initialUserType);
  const [returnUrl, setReturnUrl] = useState(initialReturnUrl);
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false,
  });

  // Update userType and returnUrl when query parameters change
  useEffect(() => {
    const roleFromUrl = searchParams.get("role");
    const returnUrlFromParams = searchParams.get("returnUrl");
    
    if (roleFromUrl && ["buyer", "seller", "agent"].includes(roleFromUrl)) {
      setUserType(roleFromUrl);
    }
    
    if (returnUrlFromParams) {
      setReturnUrl(returnUrlFromParams);
      // Store in localStorage as backup
      localStorage.setItem("returnUrl", returnUrlFromParams);
      console.log("Return URL detected and stored:", returnUrlFromParams);
    } else {
      // Clear from localStorage if not present
      localStorage.removeItem("returnUrl");
    }
  }, [searchParams]);

  // Validate if the user can login with selected role
  const validateRoleAccess = (registeredUserType, attemptedLoginType) => {
    // Define role access rules
    const roleAccessMap = {
      buyer: ["buyer", "seller"], // Buyer/Tenant can login as buyer or seller
      seller: ["buyer", "seller"], // Seller/Owner can login as buyer or seller
      agent: ["agent"], // Agent/Builder can ONLY login as agent
    };

    const allowedRoles = roleAccessMap[registeredUserType] || [];
    return allowedRoles.includes(attemptedLoginType);
  };

  const getRoleAccessMessage = (registeredType, attemptedType) => {
    const typeLabels = {
      buyer: "Buyer/Tenant",
      seller: "Seller/Owner",
      agent: "Agent/Builder",
    };

    if (registeredType === "agent" && attemptedType !== "agent") {
      return `You are registered as an Agent/Builder. You can only access the Agent/Builder dashboard.`;
    }

    if (registeredType !== "agent" && attemptedType === "agent") {
      return `You are registered as ${typeLabels[registeredType]}. You cannot access the Agent/Builder dashboard. Only registered Agents/Builders can access this section.`;
    }

    return "Access denied for this role.";
  };

  const handleSubmit = async (e) => {
    // Prevent default form submission
    if (e) {
      e.preventDefault();
    }
    
    // Prevent double submission
    if (isLoading) {
      return;
    }

    setLoginError("");
    
    // Basic validation
    if (!formData.email || !formData.password) {
      setLoginError("Please enter both email and password");
      return;
    }

    setIsLoading(true);

    try {
      console.log("Login attempt:", { email: formData.email, userType });
      const result = await login(formData.email, formData.password, userType);
      console.log("Login result:", result);

      if (result.success) {
        console.log("Login successful, navigating to dashboard...");
        console.log("Current returnUrl state:", returnUrl);
        console.log("Current returnUrl from searchParams:", searchParams.get("returnUrl"));
        
        // Store current login session
        localStorage.setItem(
          "currentSession",
          JSON.stringify({
            email: formData.email,
            loginType: userType,
            loginTime: new Date().toISOString(),
          })
        );

        // Get returnUrl from state, searchParams, or localStorage (fallback chain)
        const redirectUrl = returnUrl || searchParams.get("returnUrl") || localStorage.getItem("returnUrl");
        
        // Small delay to ensure auth state is fully updated before navigation
        setTimeout(() => {
          // Redirect to returnUrl if provided and valid, otherwise use role-based navigation
          if (redirectUrl) {
            try {
              const decodedUrl = decodeURIComponent(redirectUrl);
              // Validate that it's a relative path (starts with /)
              if (decodedUrl.startsWith('/')) {
                console.log("Redirecting back to property page:", decodedUrl);
                // Clear returnUrl from localStorage after use
                localStorage.removeItem("returnUrl");
                // Use replace: false to allow browser back button
                navigate(decodedUrl, { replace: false });
              } else {
                console.warn("Invalid returnUrl format, using role-based navigation:", decodedUrl);
                // Fallback to role-based navigation
                if (userType === "buyer") {
                  navigate("/buyer-dashboard");
                } else if (userType === "seller") {
                  navigate("/seller-dashboard");
                } else if (userType === "agent") {
                  navigate("/agent-dashboard");
                }
              }
            } catch (error) {
              console.error("Error decoding returnUrl:", error);
              // Fallback to role-based navigation
              if (userType === "buyer") {
                navigate("/buyer-dashboard");
              } else if (userType === "seller") {
                navigate("/seller-dashboard");
              } else if (userType === "agent") {
                navigate("/agent-dashboard");
              }
            }
          } else {
            console.log("No returnUrl found, using role-based navigation");
            // Role-based navigation
            if (userType === "buyer") {
              navigate("/buyer-dashboard");
            } else if (userType === "seller") {
              navigate("/seller-dashboard");
            } else if (userType === "agent") {
              navigate("/agent-dashboard");
            }
          }
        }, 100); // Small delay to ensure auth state is updated
      } else {
        const errorMsg = result.message || "Login failed. Please check your credentials.";
        console.error("Login failed:", errorMsg);
        setLoginError(errorMsg);
      }
    } catch (error) {
      console.error("Login error caught:", error);
      const errorMsg = error.message || error.data?.message || "An error occurred. Please try again.";
      setLoginError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    // Clear error when user makes changes
    if (loginError) setLoginError("");
  };

  const handleUserTypeChange = (type) => {
    setUserType(type);
    // Clear error when changing user type
    if (loginError) setLoginError("");
  };

  // Handle ENTER key to move to next input or submit form
  const handleKeyDown = (e, currentFieldName) => {
    if (e.key === "Enter") {
      e.preventDefault();
      
      // Get all input fields in order
      const inputFields = ["email", "password"];
      const currentIndex = inputFields.indexOf(currentFieldName);
      
      if (currentIndex < inputFields.length - 1) {
        // Move to next input field
        const nextFieldName = inputFields[currentIndex + 1];
        const nextInput = document.querySelector(`input[name="${nextFieldName}"]`);
        if (nextInput) {
          nextInput.focus();
        }
      } else {
        // Last field - submit the form
        handleSubmit(e);
      }
    }
  };

  // Background images mapping for each role
  const backgroundImages = {
    buyer: "/LoginBuy.jpg",
    seller: "/LoginSellerr.jpg",
    agent: "/landingpageagent.jpeg",
  };

  return (
    
    <div className="login-container">
      <div 
        className="background-image"
        style={{
          backgroundImage: `url(${backgroundImages[userType]})`,
        }}
      />
      <div className="login-card" key={userType}>
        <div className="login-header">
          <h1>Welcome Back</h1>
          <p>Sign in to continue to your account</p>
        </div>

        <div className="user-type-toggle">
          <button
            onClick={() => handleUserTypeChange("buyer")}
            className={userType === "buyer" ? "active" : ""}
          >
            <User size={20} /> Buyer/Tenant
          </button>

          <button
            onClick={() => handleUserTypeChange("seller")}
            className={userType === "seller" ? "active" : ""}
          >
            <Home size={20} /> Seller/Owner
          </button>

          <button
            onClick={() => handleUserTypeChange("agent")}
            className={userType === "agent" ? "active" : ""}
          >
            <Building2 size={20} /> Agent/Builder
          </button>
        </div>

        {/* Role Access Hint */}
        <div className="role-access-hint">
          {userType === "agent" && (
            <p className="hint-text hint-warning">
             
              Only registered Agents/Builders can access this dashboard
            </p>
          )}
          {(userType === "buyer" || userType === "seller") && (
            <p className="hint-text">
             
              Buyers and Sellers can switch between these two dashboards
            </p>
          )}
        </div>

        {/* Error Message */}
        {loginError && (
          <div className="error-message">
            <span className="error-icon">✕</span>
            {loginError}
          </div>
        )}

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              onKeyDown={(e) => handleKeyDown(e, "email")}
              placeholder="john@example.com"
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <div className="password-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                onKeyDown={(e) => handleKeyDown(e, "password")}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="password-toggle"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <div className="options-row">
            <label>
              <input
                type="checkbox"
                name="rememberMe"
                checked={formData.rememberMe}
                onChange={handleChange}
              />
              Remember me
            </label>
            <button 
              type="button"
              onClick={() => setShowForgotPasswordModal(true)}
              className="forgot-password-link"
            >
              Forgot Password?
            </button>
          </div>

          <button 
            type="submit"
            className="login-btn" 
            disabled={isLoading}
          >
            {isLoading ? "Signing In..." : `Sign In as ${userType === "buyer" ? "Buyer/Tenant" : userType === "seller" ? "Seller/Owner" : "Agent/Builder"}`}
          </button>

          <div className="signup-link">
            Don't have an account?{" "}
            <button type="button" onClick={() => {
              const registerUrl = returnUrl 
                ? `/register?role=${userType}&returnUrl=${encodeURIComponent(returnUrl)}`
                : `/register?role=${userType}`;
              navigate(registerUrl);
            }}>Register now</button>
          </div>
        </form>
      </div>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={showForgotPasswordModal}
        onClose={() => setShowForgotPasswordModal(false)}
      />
    </div>
  );
};

export default Login;