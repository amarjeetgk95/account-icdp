import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { updatePasswordSchema, type UpdatePasswordInput } from '../validation/auth.schema';
import { useUpdatePassword } from '../hooks/useAuth';
import { useAuthStore } from '@/core/auth/store';
import { toast } from '@/shared/components/Toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Lock, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  AlertTriangle, 
  Loader2, 
  ArrowRight 
} from 'lucide-react';

export function UpdatePasswordForm() {
  const navigate = useNavigate();
  const updatePasswordMutation = useUpdatePassword();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [capsLockActive, setCapsLockActive] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<UpdatePasswordInput>({
    resolver: zodResolver(updatePasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const passwordVal = useWatch({ control, name: 'password', defaultValue: '' });

  const checkStrength = (pwd: string) => {
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    return score;
  };

  const strengthScore = checkStrength(passwordVal);

  const handleKeyEvents = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (typeof e.getModifierState === 'function') {
      setCapsLockActive(e.getModifierState('CapsLock'));
    }
  };

  const onSubmit = (data: UpdatePasswordInput) => {
    updatePasswordMutation.mutate(data.password, {
      onSuccess: async () => {
        toast.success('Password updated successfully! Please sign in with your new password.');
        try {
          await useAuthStore.getState().signOut();
        } catch {
          // ignore
        }
        navigate('/login', { replace: true });
      },
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* New Password */}
      <div className="space-y-1.5">
        <Label htmlFor="password" className="text-xs font-medium text-slate-700">
          New Password
        </Label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Lock className="h-4 w-4" />
          </div>
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            {...register('password')}
            onKeyDown={handleKeyEvents}
            onKeyUp={handleKeyEvents}
            placeholder="Min 8 characters"
            autoComplete="new-password"
            className="pl-9 pr-10 bg-white border-slate-300 h-10 text-sm focus-visible:ring-slate-500"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700 transition-colors"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        {/* Password Strength Indicator */}
        {passwordVal.length > 0 && (
          <div className="pt-1 space-y-1">
            <div className="flex gap-1 h-1.5 w-full">
              <div
                className={`flex-1 rounded-full transition-colors ${
                  strengthScore >= 1 ? 'bg-rose-500' : 'bg-slate-200'
                }`}
              />
              <div
                className={`flex-1 rounded-full transition-colors ${
                  strengthScore >= 2 ? 'bg-amber-500' : 'bg-slate-200'
                }`}
              />
              <div
                className={`flex-1 rounded-full transition-colors ${
                  strengthScore >= 3 ? 'bg-teal-500' : 'bg-slate-200'
                }`}
              />
              <div
                className={`flex-1 rounded-full transition-colors ${
                  strengthScore >= 4 ? 'bg-emerald-500' : 'bg-slate-200'
                }`}
              />
            </div>
            <p className="text-[10px] text-slate-500">
              {strengthScore <= 1 && 'Weak: Use 8+ characters, mixed case & numbers'}
              {strengthScore === 2 && 'Fair: Add numbers or symbols'}
              {strengthScore === 3 && 'Good: Strong password'}
              {strengthScore >= 4 && 'Excellent: Very secure'}
            </p>
          </div>
        )}

        {errors.password && (
          <p className="text-rose-600 text-xs mt-1 flex items-center gap-1">
            <AlertCircle className="w-3 h-3 shrink-0" />
            {errors.password.message}
          </p>
        )}
      </div>

      {/* Confirm Password */}
      <div className="space-y-1.5">
        <Label htmlFor="confirmPassword" className="text-xs font-medium text-slate-700">
          Confirm New Password
        </Label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Lock className="h-4 w-4" />
          </div>
          <Input
            id="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            {...register('confirmPassword')}
            onKeyDown={handleKeyEvents}
            onKeyUp={handleKeyEvents}
            placeholder="Re-enter password"
            autoComplete="new-password"
            className="pl-9 pr-10 bg-white border-slate-300 h-10 text-sm focus-visible:ring-slate-500"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700 transition-colors"
          >
            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        {capsLockActive && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 border border-amber-200 text-amber-700 text-xs">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>Caps Lock is active</span>
          </div>
        )}

        {errors.confirmPassword && (
          <p className="text-rose-600 text-xs mt-1 flex items-center gap-1">
            <AlertCircle className="w-3 h-3 shrink-0" />
            {errors.confirmPassword.message}
          </p>
        )}
      </div>

      {updatePasswordMutation.error && (
        <div className="p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <p>
            {updatePasswordMutation.error instanceof Error
              ? updatePasswordMutation.error.message
              : 'Failed to update password. Please try again.'}
          </p>
        </div>
      )}

      <Button
        type="submit"
        disabled={updatePasswordMutation.isPending}
        className="w-full h-10 bg-slate-800 hover:bg-slate-900 text-white font-medium text-sm rounded-md transition-colors flex items-center justify-center gap-2"
      >
        {updatePasswordMutation.isPending ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Updating Password...</span>
          </>
        ) : (
          <>
            <span>Save & Sign In</span>
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </Button>
    </form>
  );
}
