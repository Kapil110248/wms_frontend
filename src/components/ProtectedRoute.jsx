import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { hasRoutePermission, getDefaultRouteForRole } from '../permissions';
import { Spin } from 'antd';

export default function ProtectedRoute({ children, allowedRoles }) {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, isAuthenticated, _hasHydrated } = useAuthStore();
    const [isAuthorized, setIsAuthorized] = useState(null);

    useEffect(() => {
        // Wait for store to hydrate from localStorage before checking auth
        if (!_hasHydrated) {
            return;
        }

        // If not authenticated, redirect to login page
        if (!isAuthenticated || !user) {
            navigate(`/auth/login?redirect=${encodeURIComponent(location.pathname)}`, { replace: true });
            return;
        }

        // Check role-based route permission
        const hasPermission = hasRoutePermission(user.role, location.pathname);

        // Also check explicit allowedRoles if provided
        const passesExplicitRoles = !allowedRoles || allowedRoles.length === 0 || allowedRoles.includes(user.role);

        if (!hasPermission || !passesExplicitRoles) {
            console.warn(`Access denied: ${user.role} cannot access ${location.pathname}`);
            // Redirect to user's default dashboard
            const defaultRoute = getDefaultRouteForRole(user.role);
            console.log(`Redirecting unauthorized user to: ${defaultRoute}`);
            navigate(defaultRoute, { replace: true });
            setIsAuthorized(false);
            return;
        }

        setIsAuthorized(true);
    }, [_hasHydrated, isAuthenticated, user, allowedRoles, navigate, location.pathname]);

    // Show loading while hydrating or checking auth
    if (!_hasHydrated || !isAuthenticated || !user) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Spin size="large" />
            </div>
        );
    }

    // Show loading while checking authorization
    if (isAuthorized === null) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Spin size="large" />
            </div>
        );
    }

    // If not authorized, show redirecting message
    if (!isAuthorized) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Spin size="large" />
            </div>
        );
    }

    return <>{children}</>;
}
