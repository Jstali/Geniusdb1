import React from "react";
import { Navigate, useLocation } from "react-router-dom";

// Simple auth check using localStorage flag 'isLoggedIn'
const isAuthenticated = () => {
  try {
    return localStorage.getItem("isLoggedIn") === "true";
  } catch (e) {
    return false;
  }
};

const RequireAuth = ({ children }) => {
  const location = useLocation();
  if (!isAuthenticated()) {
    // Redirect to login, preserve the attempted location
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return children;
};

export default RequireAuth;
