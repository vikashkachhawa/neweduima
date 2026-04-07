import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const getDefaultRouteByRole = (role) => {
    if (role === 'student') return '/student/dashboard';
    if (role === 'faculty') return '/faculty/dashboard';
    return '/dashboard';
};

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    if (!user) {
        console.log('ProtectedRoute: No user found, redirecting to login');
        return <Navigate to="/login" replace />;
    }

    const mustChangePassword = user?.mustChangePassword ?? user?.must_change_password;
    if (mustChangePassword && location.pathname !== '/change-password') {
        return <Navigate to="/change-password" replace />;
    }

    console.log('ProtectedRoute: User role:', user.role, 'Allowed roles:', allowedRoles);
    
    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
        console.log('ProtectedRoute: Role not allowed, redirecting to dashboard');
        return <Navigate to={getDefaultRouteByRole(user.role)} replace />;
    }

    return children;
};

export default ProtectedRoute;
