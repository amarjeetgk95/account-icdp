import { useState } from 'react';
import type { UserInfo } from '../types';

interface UserListProps {
  users: UserInfo[];
  isLoading: boolean;
  onSetRole: (userId: string, role: 'admin' | 'office') => void;
  onDelete: (userId: string) => void;
  currentUserEmail?: string;
}

export function UserList({ users, isLoading, onSetRole, onDelete, currentUserEmail }: UserListProps) {
  const [search, setSearch] = useState('');

  const filteredUsers = users.filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      u.email.toLowerCase().includes(q) ||
      (u.office_name || '').toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q)
    );
  });

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? '-' : d.toLocaleString('en-IN');
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (users.length === 0) {
    return <div className="text-center py-8 text-slate-500">No users found.</div>;
  }

  return (
    <div className="space-y-4">
      <input
        type="search"
        placeholder="Search email / office / role..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="input max-w-sm"
      />

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Email</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Role</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Office</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Created</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Last Sign-in</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredUsers.map((user) => {
              const isCurrentUser = user.email.toLowerCase() === (currentUserEmail || '').toLowerCase();
              return (
                <tr key={user.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">
                    {user.email}
                    {isCurrentUser && (
                      <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                        you
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-bold ${
                        user.role === 'admin'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">{user.office_name || '-'}</td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(user.created_at)}</td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(user.last_sign_in_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => onSetRole(user.id, user.role === 'admin' ? 'office' : 'admin')}
                        disabled={isCurrentUser}
                        className={`px-2 py-1 text-xs rounded ${
                          user.role === 'admin'
                            ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                        title={user.role === 'admin' ? 'Make office user' : 'Make admin'}
                      >
                        {user.role === 'admin' ? '↓ Demote' : '↑ Promote'}
                      </button>
                      <button
                        onClick={() => onDelete(user.id)}
                        disabled={isCurrentUser}
                        className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Delete user and their office"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
