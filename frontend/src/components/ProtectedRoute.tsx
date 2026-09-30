import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Role } from '../types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Role[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { isAuthenticated, role, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-attendx-bg">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-attendx-blue border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-attendx-muted">Verifying authorization...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    // Redirect to user's assigned dashboard based on their real backend role
    if (role === 'STUDENT') {
      return <Navigate to="/student/dashboard" replace />;
    } else if (role === 'TEACHER') {
      return <Navigate to="/teacher/dashboard" replace />;
    } else if (role === 'HOD_ADMIN') {
      return <Navigate to="/admin/dashboard" replace />;
    }
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
