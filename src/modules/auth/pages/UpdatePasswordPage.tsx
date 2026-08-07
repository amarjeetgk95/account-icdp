import { UpdatePasswordForm } from '../components/UpdatePasswordForm';

export function UpdatePasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-blue-50 px-4">
      <div className="w-full max-w-md">
        <div className="card p-8 shadow-lg">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🔒</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-800">Set New Password</h1>
            <p className="text-slate-500 mt-2">
              Enter your new password below
            </p>
          </div>

          <UpdatePasswordForm />
        </div>
      </div>
    </div>
  );
}
