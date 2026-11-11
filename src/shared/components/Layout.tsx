import { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="flex h-screen min-h-0 bg-slate-50 overflow-hidden text-slate-900 selection:bg-indigo-500/30 supports-[height:100dvh]:h-[100dvh]">
      <div className="flex w-full h-full min-h-0 relative">
        {children}
      </div>
    </div>
  );
}