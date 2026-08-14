import { LoginForm } from '../components/LoginForm';
import { AuthHelpDialog } from '../components/AuthHelpDialog';
import { ShieldCheck } from 'lucide-react';
import { useForceLightTheme } from '../hooks/useForceLightTheme';

export function LoginPage() {
  useForceLightTheme();

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between overflow-hidden bg-slate-50 text-slate-900 selection:bg-indigo-100">
      {/* Ambient background accents — sober, barely-there */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-80 w-[44rem] rounded-full bg-indigo-500/[0.06] blur-3xl" />
        <div className="absolute bottom-0 right-[-6rem] h-72 w-96 rounded-full bg-teal-500/[0.04] blur-3xl" />
        <div className="absolute bottom-10 left-[-6rem] h-56 w-80 rounded-full bg-slate-400/[0.07] blur-3xl" />
      </div>


      <main className="relative flex-1 flex items-center justify-center px-4 py-12 sm:px-6">
        <div className="w-full max-w-[400px]">
          {/* Brand */}
          <div className="text-center mb-8 animate-fade-in">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white ring-1 ring-slate-200/80 shadow-[0_2px_10px_-2px_rgba(15,23,42,0.08)] p-3 mb-5">
              <img src="/logo.svg" alt="ICDP Logo" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-[1.65rem] font-bold tracking-tight text-slate-900">
              Account Management System
            </h1>
          </div>

          {/* Login Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_16px_40px_-16px_rgba(15,23,42,0.18)] p-6 sm:p-8 animate-fade-in animate-fade-in-delay-1">
            <LoginForm />
          </div>

          {/* Help & Assurance */}
          <div className="flex flex-col items-center gap-3.5 text-center mt-8 animate-fade-in animate-fade-in-delay-2">
            <AuthHelpDialog triggerClassName="text-xs text-slate-500 hover:text-slate-900 font-medium transition-colors" />

            <div className="inline-flex items-center gap-1.5 text-[11px] text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
              <span>Authorized personnel only &middot; Encrypted session</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative py-4 text-center text-[11px] text-slate-400 border-t border-slate-200/60">
        Account Management System &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}