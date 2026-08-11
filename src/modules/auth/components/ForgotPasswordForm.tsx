import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { forgotPasswordSchema, type ForgotPasswordInput } from '../validation/auth.schema';
import { useForgotPassword } from '../hooks/useAuth';

export function ForgotPasswordForm() {
  const forgotPasswordMutation = useForgotPassword();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = (data: ForgotPasswordInput) => {
    forgotPasswordMutation.mutate(data.email);
  };

  if (forgotPasswordMutation.isSuccess) {
    return (
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-slate-800">Check your email</h2>
        <p className="text-slate-600">
          If an account exists with that email, we&apos;ve sent a password reset link.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label htmlFor="email" className="label">
          Email Address
        </label>
        <input
          id="email"
          type="email"
          {...register('email')}
          className="input"
          placeholder="you@example.com"
          autoComplete="email"
        />
        {errors.email && (
          <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
        )}
      </div>

      {forgotPasswordMutation.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-600 text-sm">
            {forgotPasswordMutation.error instanceof Error
              ? forgotPasswordMutation.error.message
              : 'Failed to send reset email'}
          </p>
        </div>
      )}

      <button
        type="submit"
        disabled={forgotPasswordMutation.isPending}
        className="btn btn-primary w-full"
      >
        {forgotPasswordMutation.isPending ? 'Sending...' : 'Send Reset Link'}
      </button>
    </form>
  );
}
