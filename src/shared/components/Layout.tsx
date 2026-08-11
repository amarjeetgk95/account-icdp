import { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden text-slate-900 dark:text-slate-100 selection:bg-indigo-500/30">
      {/* Optional decorative background blob */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-indigo-500/5 blur-[100px] dark:bg-indigo-500/10" />
        <div className="absolute top-1/2 -left-20 w-[400px] h-[400px] rounded-full bg-teal-500/5 blur-[100px] dark:bg-teal-500/10" />
      </div>
      <div className="flex w-full h-full relative z-10">
        {children}
      </div>
    </div>
  );
}
