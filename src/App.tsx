import { useModules } from '@/modules';
import { Layout } from '@/shared/components/Layout';
import { Routes } from '@/shared/components/Routes';
import { Sidebar } from '@/shared/components/Sidebar';
import { Header } from '@/shared/components/Header';
import { CommandPalette } from '@/shared/components/CommandPalette';
import { AuthGate } from '@/shared/components/AuthGate';
import { ErrorBoundary } from '@/shared/components/ErrorBoundary';
import { ToastContainer } from '@/shared/components/Toast';
import { Toaster } from '@/components/ui/toaster';
import { SkeletonTable, SkeletonCard } from '@/shared/components/Skeleton';
import { useAuthStore } from '@/core/auth/store';
import { useUIStore } from '@/core/stores/ui-store';
import { usePermissions } from '@/core/permissions/hooks';
import { Navigate, useLocation } from 'react-router-dom';
import { useEffect, useState, Suspense } from 'react';

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
  const [showCommandPalette, setShowCommandPalette] = useState(false);

  useEffect(() => {
    if (!isRoleLoaded) {
      initialize();
    }
  }, [isRoleLoaded, initialize]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setShowCommandPalette((open) => !open);
      }
      if (e.key === '\\' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        useUIStore.getState().toggleSidebar();
      }
    };
    window.addEventListener('keydown', down);
    return () => window.removeEventListener('keydown', down);
  }, []);

  const isAuthPage = AUTH_PATHS.has(location.pathname);
  const isUpdatePasswordPage = location.pathname === '/update-password';
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
        ) : (
          <Layout>
            <Sidebar modules={modules} />
            <div className="flex-1 flex flex-col overflow-hidden">
              <Header />
              <main className="flex-1 overflow-hidden">
                <div className="app-scroll h-full p-4 pt-3">
                  <Suspense fallback={<LoadingFallback />}>
                    <Routes modules={modules} />
                  </Suspense>
                </div>
              </main>
            </div>
            <CommandPalette isOpen={showCommandPalette} onClose={() => setShowCommandPalette(false)} />
          </Layout>
        )}
        <ToastContainer />
        <Toaster />
      </AuthGate>
    </ErrorBoundary>
  );
}
