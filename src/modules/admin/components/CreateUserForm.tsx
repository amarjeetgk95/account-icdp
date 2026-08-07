import { useState } from 'react';
import type { CreateUserInput } from '../types';

interface CreateUserFormProps {
  offices: { id: string; name: string; users: number }[];
  onSubmit: (input: CreateUserInput) => void;
  isLoading: boolean;
}

export function CreateUserForm({ offices, onSubmit, isLoading }: CreateUserFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'office'>('office');
  const [officeName, setOfficeName] = useState('');
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const availableOffices = offices.filter((o) => Number(o.users) === 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStatus({ type: 'info', message: 'Creating account...' });

    onSubmit({
      email: email.trim(),
      password,
      role,
      officeName: officeName.trim(),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
          <input
            id="cuPassword"
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input"
            placeholder="e.g. Office@2026"
            minLength={8}
            required
          />
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
          className={`px-4 py-2 rounded-lg ${
            status.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : status.type === 'error'
              ? 'bg-red-50 text-red-700 border border-red-200'
              : 'bg-blue-50 text-blue-700 border border-blue-200'
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
        {isLoading ? 'Creating...' : 'Create Account'}
      </button>
    </form>
  );
}
