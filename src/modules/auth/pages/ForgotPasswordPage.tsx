import { Link } from 'react-router-dom';
import { ForgotPasswordForm } from '../components/ForgotPasswordForm';

export function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        <div className="card p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-slate-800">Reset Password</h1>
            <p className="text-slate-500 mt-2">
              Enter your email address and we'll send you a reset link
            </p>
          </div>

          <ForgotPasswordForm />

          <div className="text-center mt-6">
            <Link
              to="/login"
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
