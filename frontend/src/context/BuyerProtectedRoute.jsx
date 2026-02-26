// src/context/BuyerProtectedRoute.jsx
// Ensures only users with role 'buyer' can access buyer dashboard routes.
// Agents and sellers are redirected to their own dashboards.
import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

const BuyerProtectedRoute = ({ children, allowAgents = false }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <div className="spinner" style={{
          width: '40px',
          height: '40px',
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #0077C0',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <p>Loading...</p>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Not logged in: allow access (buyer dashboard can be browsed by guests)
  if (!user) {
    return children;
  }

  const userRole = user.user_type || user.role;

  // Only buyers can access buyer dashboard routes, unless allowAgents is true
  if (userRole !== 'buyer') {
    if (allowAgents && userRole === 'agent') {
      return children;
    }
    if (userRole === 'agent') {
      return <Navigate to="/agent-dashboard" replace />;
    }
    if (userRole === 'seller') {
      return <Navigate to="/seller-dashboard" replace />;
    }
    return <Navigate to="/" replace />;
  }

  return children;
};

export default BuyerProtectedRoute;
