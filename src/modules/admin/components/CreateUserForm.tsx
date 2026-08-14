import { useState, useRef, useEffect } from 'react';
import {
  Eye,
  EyeOff,
  UserPlus,
  Mail,
  Send,
  KeyRound,
  ShieldCheck,
  Building2,
  CheckCircle2,
  XCircle,
  Info,
  ChevronDown,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { CreateUserInput, UserInviteMethod } from '../types';

interface CreateUserFormProps {
  offices: { id: string; name: string; users: number }[];
  onSubmit: (input: CreateUserInput) => Promise<string>;
  isLoading: boolean;
}

const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['admin', 'office']),
  officeName: z.string().min(2, 'Office name must be at least 2 characters'),
  password: z.string().optional(),
});

type CreateUserFormValues = z.infer<typeof createUserSchema>;

export function CreateUserForm({ offices, onSubmit, isLoading }: CreateUserFormProps) {
  const [method, setMethod] = useState<UserInviteMethod>('password');
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const statusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (statusTimer.current) clearTimeout(statusTimer.current);
    };
  }, []);

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { email: '', role: 'office', officeName: '', password: '' },
  });

  const availableOffices = offices.filter((o) => Number(o.users) === 0);

  const onValid = async (data: CreateUserFormValues) => {
    // Zod validates email/role/officeName; password length is conditional on the invite method.
    if (method === 'password' && (!data.password || data.password.length < 8)) {
      setError('password', { type: 'manual', message: 'Password must be at least 8 characters' });
      return;
    }

    setStatus({ type: 'info', message: 'Creating account...' });
    try {
      const message = await onSubmit({
        email: data.email.trim(),
        password: method === 'password' ? data.password : undefined,
        role: data.role,
        officeName: data.officeName.trim(),
      });
      setStatus({ type: 'success', message });
      reset({ email: '', role: 'office', officeName: '', password: '' });
      statusTimer.current = setTimeout(() => setStatus(null), 5000);
    } catch (error) {
      setStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to create user',
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(onValid)} className="space-y-5">
      <div className="um-segmented" role="group" aria-label="User invitation method">
        <button
          type="button"
          onClick={() => setMethod('password')}
          aria-pressed={method === 'password'}
          className={'um-seg-btn ' + (method === 'password' ? 'um-seg-active' : '')}
        >
          <UserPlus size={14} /> Set password
        </button>
        <button
          type="button"
          onClick={() => setMethod('invite')}
          aria-pressed={method === 'invite'}
          className={'um-seg-btn ' + (method === 'invite' ? 'um-seg-active' : '')}
        >
          <Mail size={14} /> Send invite
        </button>
      </div>

      {method === 'invite' && (
        <div className="um-info-chip">
          <Info size={15} className="shrink-0 mt-0.5" />
          <span>An email invitation will be sent. The user verifies their email and sets their own password.</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-5">
        <div className="um-field">
          <label htmlFor="cuEmail" className="label">
            Email
          </label>
          <div className="relative">
            <Mail size={15} className="um-field-icon" />
            <input
              id="cuEmail"
              type="email"
              autoComplete="email"
              className="input pl-9 pr-9"
              placeholder="user@example.com"
              {...register('email')}
            />
          </div>
          {errors.email && <span className="um-field-error">{errors.email.message}</span>}
        </div>

        <div className="um-field">
          <label htmlFor="cuPassword" className="label">
            Password
          </label>
          <div className="relative">
            <KeyRound size={15} className="um-field-icon" />
            <input
              id="cuPassword"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              className="input pl-9 pr-9"
              placeholder={method === 'invite' ? 'Set after invite' : 'Min 8 characters'}
              disabled={method === 'invite'}
              {...register('password')}
            />
            {method === 'password' && (
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            )}
          </div>
          {errors.password && <span className="um-field-error">{errors.password.message}</span>}
        </div>

        <div className="um-field">
          <label htmlFor="cuRole" className="label">
            Role
          </label>
          <div className="relative">
            <ShieldCheck size={15} className="um-field-icon" />
            <select id="cuRole" className="input pl-9 pr-9 appearance-none" {...register('role')}>
              <option value="office">Office</option>
              <option value="admin">Admin</option>
            </select>
            <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" />
          </div>
          {errors.role && <span className="um-field-error">{errors.role.message}</span>}
        </div>

        <div className="um-field">
          <label htmlFor="cuOffice" className="label">
            Office
          </label>
          <div className="relative">
            <Building2 size={15} className="um-field-icon" />
            <input
              id="cuOffice"
              type="text"
              className="input pl-9"
              placeholder="Type office name..."
              list="cuOfficeList"
              {...register('officeName')}
            />
          </div>
          <datalist id="cuOfficeList">
            {availableOffices.map((o) => (
              <option key={o.id} value={o.name} />
            ))}
          </datalist>
          {errors.officeName && <span className="um-field-error">{errors.officeName.message}</span>}
        </div>
      </div>

      {status && (
        <div
          className={
            'alert ' +
            (status.type === 'success'
              ? 'alert-success'
              : status.type === 'error'
              ? 'alert-danger'
              : 'alert-info')
          }
        >
          {status.type === 'success' ? (
            <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
          ) : status.type === 'error' ? (
            <XCircle size={16} className="shrink-0 mt-0.5" />
          ) : (
            <Info size={16} className="shrink-0 mt-0.5" />
          )}
          <span>{status.message}</span>
        </div>
      )}

      <button type="submit" disabled={isSubmitting || isLoading} className="btn btn-primary um-submit">
        {isSubmitting || isLoading ? (
          <>
            <span className="animate-spin rounded-full border-2 border-white/30 border-t-white h-4 w-4"></span>
            Working...
          </>
        ) : (
          <>
            {method === 'password' ? <UserPlus size={16} /> : <Send size={16} />}
            {method === 'password' ? 'Create Account' : 'Send Invitation'}
          </>
        )}
      </button>
    </form>
  );
}