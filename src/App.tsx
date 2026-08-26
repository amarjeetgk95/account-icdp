import { useModules } from '@/modules';
import { Layout } from '@/shared/components/Layout';
import { Routes } from '@/shared/components/Routes';
import { Header } from '@/shared/components/Header';
import { AuthGate } from '@/shared/components/AuthGate';
import { ErrorBoundary } from '@/shared/components/ErrorBoundary';
import { ToastContainer } from '@/shared/components/Toast';
import { Toaster } from '@/components/ui/toaster';
import { SkeletonTable, SkeletonCard } from '@/shared/components/Skeleton';
import { useAuthStore } from '@/core/auth/store';
import { usePermissions } from '@/core/permissions/hooks';
import { Navigate, useLocation } from 'react-router-dom';
import { useEffect, Suspense } from 'react';

const AUTH_PATHS = new Set(['/login', '/forgot-password', '/update-password']);

function LoadingFallback() {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
      <SkeletonTable rows={6} cols={5} />
    </div>
  );
}

export default function App() {
  const modules = useModules();
  const { user, isRoleLoaded, initialize } = useAuthStore();
  const { isAdmin } = usePermissions();
  const location = useLocation();

  useEffect(() => {
    if (!isRoleLoaded) {
      initialize();
    }
  }, [isRoleLoaded, initialize]);

  const isAuthPage = AUTH_PATHS.has(location.pathname);
  const isUpdatePasswordPage = location.pathname === '/update-password';
  const isStandalonePage =
    (location.pathname.startsWith('/paybill/form16/') &&
      location.pathname !== '/paybill/form16') ||
    location.pathname === '/paybill/legacy-edit';
  const postLoginRedirect = isRoleLoaded ? (isAdmin ? '/admin' : '/dashboard') : null;

  return (
    <ErrorBoundary>
      <AuthGate>
        {!user && !isAuthPage ? (
          <Navigate to="/login" replace />
        ) : user && isAuthPage && !isUpdatePasswordPage && isRoleLoaded && postLoginRedirect ? (
          <Navigate to={postLoginRedirect} replace />
        ) : isAuthPage ? (
          <main className="flex-1">
            <Suspense fallback={<LoadingFallback />}>
              <Routes modules={modules} />
            </Suspense>
          </main>
        ) : isStandalonePage ? (
          <div className="h-screen w-full overflow-hidden bg-slate-50 dark:bg-slate-950 flex flex-col">
            <Suspense fallback={<LoadingFallback />}>
              <Routes modules={modules} />
            </Suspense>
          </div>
        ) : (
          <Layout>
            <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
              {/* Level 1: Horizontal Top Navigation with Cascading Flyout Menus */}
              <Header modules={modules} />

              {/* Workspace Main Scrollable Content */}
              <main className="flex-1 overflow-y-auto app-scroll p-4 md:p-6">
                <Suspense fallback={<LoadingFallback />}>
                  <Routes modules={modules} />
                </Suspense>
              </main>
            </div>
          </Layout>
        )}
        <ToastContainer />
        <Toaster />
      </AuthGate>
    </ErrorBoundary>
  );
}
