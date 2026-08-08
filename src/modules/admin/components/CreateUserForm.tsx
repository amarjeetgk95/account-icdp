import { useState, useRef, useEffect } from 'react';
import { Eye, EyeOff, UserPlus, Mail } from 'lucide-react';
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => setMethod('password')}
          className={
            'px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors flex items-center gap-1.5 ' +
            (method === 'password'
              ? 'bg-blue-50 text-blue-700 border-blue-300'
              : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50')
          }
        >
          <UserPlus size={13} /> Set password
        </button>
        <button
          type="button"
          onClick={() => setMethod('invite')}
          className={
            'px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors flex items-center gap-1.5 ' +
            (method === 'invite'
              ? 'bg-green-50 text-green-700 border-green-300'
              : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50')
          }
        >
          <Mail size={13} /> Send invite
        </button>
      </div>

      {method === 'invite' && (
        <div className="alert alert-info">
          An email invitation will be sent. The user verifies their email and sets their own password.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label htmlFor="cuEmail" className="label">
            Email
          </label>
          <input
            id="cuEmail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
            placeholder="user@office.com"
            required
          />
        </div>

        <div>
          <label htmlFor="cuPassword" className="label">
            Password <span className="text-slate-400 font-normal">(min 8)</span>
          </label>
          <div className="relative">
            <input
              id="cuPassword"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input pr-10"
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
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="cuRole" className="label">
            Role
          </label>
          <select
            id="cuRole"
            value={role}
            onChange={(e) => setRole(e.target.value as 'admin' | 'office')}
            className="input"
          >
            <option value="office">Office</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <div>
          <label htmlFor="cuOffice" className="label">
            Office
          </label>
          <input
            id="cuOffice"
            type="text"
            value={officeName}
            onChange={(e) => setOfficeName(e.target.value)}
            className="input"
            placeholder="Type office name..."
            list="cuOfficeList"
            required
          />
          <datalist id="cuOfficeList">
            {availableOffices.map((o) => (
              <option key={o.id} value={o.name} />
            ))}
          </datalist>
        </div>
      </div>

      {status && (
        <div
          className={`px-4 py-2 rounded-lg border text-sm font-semibold ${
            status.type === 'success'
              ? 'bg-green-50 text-green-700 border-green-200'
              : status.type === 'error'
              ? 'bg-red-50 text-red-700 border-red-200'
              : 'bg-blue-50 text-blue-700 border-blue-200'
          }`}
        >
          {status.message}
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="btn btn-primary"
      >
        {isLoading
          ? 'Working...'
          : method === 'password'
          ? 'Create Account'
          : 'Send Invitation'}
      </button>
    </form>
  );
}
