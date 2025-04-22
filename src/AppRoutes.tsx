
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import ResetPassword from "./pages/ResetPassword";
import ProtectedRoute from "./components/ProtectedRoute";
import { useAuth } from "./contexts/AuthContext";

const LoadingDisplay = () => (
  <div className="flex h-screen items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-2"></div>
    <span>Loading authentication...</span>
  </div>
);

const AppRoutes = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingDisplay />;
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route 
        path="/auth" 
        element={!user ? <Auth /> : <Navigate to="/" replace />} 
      />
      <Route path="/auth/callback" element={<AuthCallback />} />
      
      {/* Reset password route - accessible regardless of auth state 
          Important: This must be outside the condition that checks if user exists */}
      <Route path="/auth/reset-password" element={<ResetPassword />} />
      
      {/* Protected routes */}
      <Route 
        path="/" 
        element={
          user ? <ProtectedRoute><Index /></ProtectedRoute> : <Navigate to="/auth" replace />
        } 
      />
      <Route 
        path="/profile" 
        element={
          user ? <ProtectedRoute><Profile /></ProtectedRoute> : <Navigate to="/auth" replace />
        } 
      />
      
      {/* Catch-all route */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRoutes;
