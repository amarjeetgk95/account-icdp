import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { usePermissions, useRequireRole } from '@/core/permissions/hooks';
import type { UserRole } from '@/shared/types/module';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const location = useLocation();
  const { profile, isLoading: isPermissionsLoading } = usePermissions();
  const { hasAccess, isLoading: isRoleLoading } = useRequireRole(allowedRoles);

  const isAuthPage =
    location.pathname === '/login' ||
    location.pathname === '/login/admin' ||
    location.pathname === '/forgot-password' ||
    location.pathname === '/update-password';

  if (isAuthPage) {
    return <>{children}</>;
  }

  const isLoading = isPermissionsLoading || isRoleLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!profile) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0 && !hasAccess) {
    return <Navigate to={profile.role === 'admin' ? '/admin' : '/dashboard'} replace />;
  }

  return <>{children}</>;
}
