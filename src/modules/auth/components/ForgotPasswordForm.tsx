import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { forgotPasswordSchema, type ForgotPasswordInput } from '../validation/auth.schema';
import { useForgotPassword } from '../hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, CheckCircle2, AlertCircle, Loader2, ArrowRight } from 'lucide-react';

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
      <div className="text-center py-4 space-y-4">
        <div className="w-14 h-14 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-center mx-auto text-emerald-600">
          <CheckCircle2 className="w-7 h-7" />
        </div>
        <div className="space-y-1.5">
          <h3 className="text-lg font-semibold text-slate-900">Reset Link Sent</h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
            If an account exists for the provided email address, a password recovery link has been dispatched with instructions.
          </p>
        </div>
        <div className="p-3 rounded-md bg-slate-50 border border-slate-200 text-xs text-slate-500">
          Please check your inbox as well as the Spam/Junk folders.
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email" className="text-xs font-medium text-slate-700">
          Registered Email Address
        </Label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Mail className="h-4 w-4" />
          </div>
          <Input
            id="email"
            type="email"
            {...register('email')}
            placeholder="you@example.com"
            autoComplete="email"
            className="pl-9 bg-white border-slate-300 h-10 text-sm focus-visible:ring-slate-500"
          />
        </div>
        {errors.email && (
          <p className="text-rose-600 text-xs mt-1 flex items-center gap-1">
            <AlertCircle className="w-3 h-3 shrink-0" />
            {errors.email.message}
          </p>
        )}
      </div>

      {forgotPasswordMutation.error && (
        <div className="p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <p>
            {forgotPasswordMutation.error instanceof Error
              ? forgotPasswordMutation.error.message
              : 'Failed to dispatch reset email. Please try again or contact the system administrator.'}
          </p>
        </div>
      )}

      <Button
        type="submit"
        disabled={forgotPasswordMutation.isPending}
        className="w-full h-10 bg-slate-800 hover:bg-slate-900 text-white font-medium text-sm rounded-md transition-colors flex items-center justify-center gap-2"
      >
        {forgotPasswordMutation.isPending ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Sending Link...</span>
          </>
        ) : (
          <>
            <span>Send Reset Instructions</span>
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </Button>
    </form>
  );
}
