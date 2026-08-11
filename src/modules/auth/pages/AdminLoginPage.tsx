import { Shield, Info } from 'lucide-react';
import { LoginForm } from '../components/LoginForm';

export function AdminLoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-100 px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-8 shadow-2xl backdrop-blur-sm">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-4">
              <Shield size={14} />
              Admin Console
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">ICDP Admin Portal</h1>
            <p className="text-slate-400 text-sm mt-1.5">
              Sign in with system administrator credentials
            </p>
          </div>

          <LoginForm />
        </div>

        <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 flex items-start gap-3 text-xs text-slate-400">
          <Info size={16} className="text-blue-400 shrink-0 mt-0.5" />
          <p>
            <span className="font-semibold text-slate-300">Admin Support Note:</span> Access to the Admin Console is restricted to authorized system administrators. Contact IT Support for privilege changes.
          </p>
        </div>

        <p className="text-center text-xs text-slate-500">
          ICDP Surat Tax System v1.0 • Admin Portal
        </p>
      </div>
    </div>
  );
}
