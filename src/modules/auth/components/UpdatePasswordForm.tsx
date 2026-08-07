import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { updatePasswordSchema, type UpdatePasswordInput } from '../validation/auth.schema';
import { useUpdatePassword } from '../hooks/useAuth';

export function UpdatePasswordForm() {
  const navigate = useNavigate();
  const updatePasswordMutation = useUpdatePassword();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdatePasswordInput>({
    resolver: zodResolver(updatePasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = (data: UpdatePasswordInput) => {
    updatePasswordMutation.mutate(data.password, {
      onSuccess: () => {
        navigate('/login');
      },
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label htmlFor="password" className="label">
          New Password
        </label>
        <input
          id="password"
          type="password"
          {...register('password')}
          className="input"
          placeholder="Enter new password"
          autoComplete="new-password"
        />
        {errors.password && (
          <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="confirmPassword" className="label">
          Confirm Password
        </label>
        <input
          id="confirmPassword"
          type="password"
          {...register('confirmPassword')}
          className="input"
          placeholder="Confirm new password"
          autoComplete="new-password"
        />
        {errors.confirmPassword && (
          <p className="text-red-500 text-sm mt-1">{errors.confirmPassword.message}</p>
        )}
      </div>

      {updatePasswordMutation.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-600 text-sm">
            {updatePasswordMutation.error instanceof Error
              ? updatePasswordMutation.error.message
              : 'Failed to update password'}
          </p>
        </div>
      )}

      <button
        type="submit"
        disabled={updatePasswordMutation.isPending}
        className="btn btn-primary w-full"
      >
        {updatePasswordMutation.isPending ? 'Updating...' : 'Update Password'}
      </button>
    </form>
  );
}
