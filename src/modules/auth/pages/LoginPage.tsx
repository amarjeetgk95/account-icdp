import { LoginForm } from '../components/LoginForm';

export function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-blue-50 px-4">
      <div className="w-full max-w-md">
        <div className="card p-8 shadow-lg">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🏛️</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-800">ICDP Tax System</h1>
            <p className="text-slate-500 mt-2">Sign in to your account</p>
          </div>

          <LoginForm />
        </div>

        <p className="text-center text-xs text-slate-400 mt-4">
          ICDP Surat Tax System v1.0
        </p>
      </div>
    </div>
  );
}
