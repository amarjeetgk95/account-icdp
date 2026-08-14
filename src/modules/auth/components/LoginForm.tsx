import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { loginSchema, type LoginInput } from '../validation/auth.schema';
import { useLogin } from '../hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  AlertTriangle,
  Loader2,
  ArrowRight,
} from 'lucide-react';

const REMEMBER_EMAIL_KEY = 'icdp_remembered_email';

const fieldClasses =
  'pl-9 h-11 rounded-lg bg-slate-50/60 border-slate-200 text-sm shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition-all duration-200 ' +
  'focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-indigo-500/25 focus-visible:border-indigo-400/70';

export function LoginForm() {
  const loginMutation = useLogin();
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockActive, setCapsLockActive] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => {
    try {
      return Boolean(localStorage.getItem(REMEMBER_EMAIL_KEY));
    } catch {
      return false;
    }
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: (() => {
        try {
          const saved = localStorage.getItem(REMEMBER_EMAIL_KEY);
          if (saved) return saved;
        } catch {
          // ignore
        }
        return '';
      })(),
      password: '',
    },
  });

  const handlePasswordKeyEvents = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (typeof e.getModifierState === 'function') {
      setCapsLockActive(e.getModifierState('CapsLock'));
    }
  };

  const onSubmit = (data: LoginInput) => {
    try {
      if (rememberMe) {
        localStorage.setItem(REMEMBER_EMAIL_KEY, data.email);
      } else {
        localStorage.removeItem(REMEMBER_EMAIL_KEY);
      }
    } catch {
      // ignore storage error
    }

    loginMutation.mutate(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Email */}
      <div className="space-y-1.5">
        <Label htmlFor="email" className="text-xs font-semibold text-slate-700">
          Email
        </Label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Mail className="h-4 w-4" />
          </div>
          <Input
            id="email"
            type="email"
            {...register('email')}
            placeholder="office@example.com"
            autoComplete="email"
            className={fieldClasses}
          />
        </div>
        {errors.email && (
          <p className="text-rose-600 text-xs mt-1 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{errors.email.message}</span>
          </p>
        )}
      </div>

      {/* Password */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="password" className="text-xs font-semibold text-slate-700">
            Password
          </Label>
          <Link
            to="/forgot-password"
            className="text-xs text-slate-500 hover:text-slate-900 font-medium transition-colors"
          >
            Forgot password?
          </Link>
        </div>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Lock className="h-4 w-4" />
          </div>
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            {...register('password')}
            onKeyDown={handlePasswordKeyEvents}
            onKeyUp={handlePasswordKeyEvents}
            placeholder="••••••••"
            autoComplete="current-password"
            className={`${fieldClasses} pr-11`}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700 transition-colors focus:outline-none"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Caps lock warning */}
        {capsLockActive && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-xs">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
            <span>Caps Lock is ON</span>
          </div>
        )}

        {errors.password && (
          <p className="text-rose-600 text-xs mt-1 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{errors.password.message}</span>
          </p>
        )}
      </div>

      {/* Remember me */}
      <div className="flex items-center pt-0.5">
        <label className="flex items-center gap-2 cursor-pointer select-none group">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-indigo-600 accent-indigo-600 focus:ring-indigo-500/30 cursor-pointer transition-colors"
          />
          <span className="text-xs text-slate-600 group-hover:text-slate-800 transition-colors">
            Remember my email
          </span>
        </label>
      </div>

      {/* Error display */}
      {loginMutation.error && (
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
          <div className="leading-snug">
            <p className="font-semibold">Sign In Failed</p>
            <p className="mt-0.5 text-rose-700">
              {loginMutation.error instanceof Error
                ? loginMutation.error.message
                : 'Invalid email or password.'}
            </p>
          </div>
        </div>
      )}

      {/* Submit button */}
      <Button
        type="submit"
        disabled={loginMutation.isPending}
        className="group w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-sm rounded-lg transition-all duration-200 flex items-center justify-center gap-2 mt-2 shadow-sm shadow-indigo-600/20 active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-indigo-500/40 focus-visible:ring-offset-2"
      >
        {loginMutation.isPending ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Verifying credentials&hellip;</span>
          </>
        ) : (
          <>
            <span>Sign In</span>
            <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          </>
        )}
      </Button>
    </form>
  );
}