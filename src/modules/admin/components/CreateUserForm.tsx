import { useState, useRef, useEffect } from 'react';
import { Eye, EyeOff, UserPlus, Mail, Send, KeyRound, ShieldCheck, Building2, CheckCircle2, XCircle, Info, ChevronDown } from 'lucide-react';
import type { CreateUserInput, UserInviteMethod } from '../types';

interface CreateUserFormProps {
  offices: { id: string; name: string; users: number }[];
  onSubmit: (input: CreateUserInput) => Promise<string>;
  isLoading: boolean;
}

export function CreateUserForm({ offices, onSubmit, isLoading }: CreateUserFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'office'>('office');
  const [officeName, setOfficeName] = useState('');
  const [method, setMethod] = useState<UserInviteMethod>('password');
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const statusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (statusTimer.current) clearTimeout(statusTimer.current);
    };
  }, []);

  const availableOffices = offices.filter((o) => Number(o.users) === 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setStatus({ type: 'info', message: 'Creating account...' });

    try {
      const message = await onSubmit({
        email: email.trim(),
        password: method === 'password' ? password : undefined,
        role,
        officeName: officeName.trim(),
      });
      setStatus({ type: 'success', message });
      setEmail('');
      setPassword('');
      setOfficeName('');
      statusTimer.current = setTimeout(() => setStatus(null), 5000);
    } catch (error) {
      setStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to create user',
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input pl-9"
              placeholder="user@office.com"
              required
            />
          </div>
        </div>

        <div className="um-field">
          <label htmlFor="cuPassword" className="label">
            Password <span className="text-slate-400 dark:text-slate-500 font-normal">(min 8)</span>
          </label>
          <div className="relative">
            <KeyRound size={15} className="um-field-icon" />
            <input
              id="cuPassword"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input pl-9 pr-10"
              placeholder="e.g. Office@2026"
              minLength={method === 'password' ? 8 : undefined}
              required={method === 'password'}
              disabled={method === 'invite'}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              disabled={method === 'invite'}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-slate-400 dark:disabled:hover:text-slate-500 transition-colors"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div className="um-field">
          <label htmlFor="cuRole" className="label">
            Role
          </label>
          <div className="relative">
            <ShieldCheck size={15} className="um-field-icon" />
            <select
              id="cuRole"
              value={role}
              onChange={(e) => setRole(e.target.value as 'admin' | 'office')}
              className="input pl-9 pr-9 appearance-none"
            >
              <option value="office">Office</option>
              <option value="admin">Admin</option>
            </select>
            <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" />
          </div>
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
              value={officeName}
              onChange={(e) => setOfficeName(e.target.value)}
              className="input pl-9"
              placeholder="Type office name..."
              list="cuOfficeList"
              required
            />
          </div>
          <datalist id="cuOfficeList">
            {availableOffices.map((o) => (
              <option key={o.id} value={o.name} />
            ))}
          </datalist>
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

      <button
        type="submit"
        disabled={isLoading}
        className="btn btn-primary um-submit"
      >
        {isLoading ? (
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
