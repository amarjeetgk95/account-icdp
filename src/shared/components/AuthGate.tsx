import { ReactNode } from 'react';
import { useAuthStore } from '@/core/auth/store';

interface AuthGateProps {
  children: ReactNode;
}

export function AuthGate({ children }: AuthGateProps) {
  const { isRoleLoaded } = useAuthStore();

  if (!isRoleLoaded) {
    return (
      <div className="flex items-center justify-center h-screen w-full bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
          <p className="text-sm text-slate-500 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
