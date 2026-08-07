import { useModules } from '@/modules';
import { Layout } from '@/shared/components/Layout';
import { Routes } from '@/shared/components/Routes';
import { Sidebar } from '@/shared/components/Sidebar';
import { Header } from '@/shared/components/Header';
import { CommandPalette } from '@/shared/components/CommandPalette';
import { useAuthStore } from '@/core/auth/store';
import { Navigate, useLocation } from 'react-router-dom';
import { useEffect, useState, Suspense } from 'react';

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );
}

export default function App() {
  const modules = useModules();
  const { user, isLoading, isInitialized, initialize } = useAuthStore();
  const location = useLocation();
  const [showCommandPalette, setShowCommandPalette] = useState(false);

  useEffect(() => {
    if (!isInitialized) {
      initialize();
    }
  }, [isInitialized, initialize]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setShowCommandPalette((open) => !open);
      }
    };
    window.addEventListener('keydown', down);
    return () => window.removeEventListener('keydown', down);
  }, []);

  const isAuthPage =
    location.pathname === '/login' ||
    location.pathname === '/forgot-password' ||
    location.pathname === '/update-password';

  if (isLoading && !isInitialized) {
    return <LoadingFallback />;
  }

  if (!user && !isAuthPage) {
    return <Navigate to="/login" replace />;
  }

  if (user && isAuthPage) {
    return <Navigate to="/dashboard" replace />;
  }

  if (isAuthPage) {
    return (
      <main className="flex-1">
        <Suspense fallback={<LoadingFallback />}>
          <Routes modules={modules} />
        </Suspense>
      </main>
    );
  }

  return (
    <Layout>
      <Sidebar modules={modules} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-hidden">
          <div className="app-scroll h-full p-6">
          <Suspense fallback={<LoadingFallback />}>
            <Routes modules={modules} />
          </Suspense>
          </div>
        </main>
      </div>
      <CommandPalette isOpen={showCommandPalette} onClose={() => setShowCommandPalette(false)} />
    </Layout>
  );
}
