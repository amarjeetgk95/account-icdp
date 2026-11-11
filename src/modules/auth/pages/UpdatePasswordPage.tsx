import { Link } from 'react-router-dom';
import { Lock, ArrowLeft, ShieldCheck } from 'lucide-react';
import { UpdatePasswordForm } from '../components/UpdatePasswordForm';
import { useForceLightTheme } from '../hooks/useForceLightTheme';

export function UpdatePasswordPage() {
  useForceLightTheme();

  return (
    <div className="flex min-h-screen min-h-[100dvh] w-full flex-col justify-between bg-slate-50 text-slate-900 selection:bg-slate-200">
      <div className="w-full h-1 bg-slate-800/90" />

      <main className="flex flex-1 items-center justify-center px-4 py-8 sm:px-6 sm:py-12">
        <div className="w-full max-w-[390px] space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white border border-slate-200/90 shadow-sm text-slate-700 mb-1">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xs font-bold tracking-tight text-slate-900">
                Create New Password
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Choose a strong password for your account
              </p>
            </div>
          </div>

          {/* Card */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-7">
            <UpdatePasswordForm />
          </div>

          {/* Back link & Assurance */}
          <div className="flex flex-col items-center gap-3 text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to sign in</span>
            </Link>

            <div className="inline-flex items-center gap-1.5 text-xs text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
              <span>Secured credential update</span>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-200/60 px-4 pb-safe pt-4 text-center text-xs text-slate-400">
        Account Management System &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}