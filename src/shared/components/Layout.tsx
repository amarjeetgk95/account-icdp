import { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden text-slate-900 selection:bg-indigo-500/30">
      <div className="flex w-full h-full relative">
        {children}
      </div>
    </div>
  );
}