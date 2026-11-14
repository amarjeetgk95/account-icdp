import type { RouteDefinition } from '@/shared/types/module';
import { lazyNamedExport } from '@/shared/utilities/lazyNamed';

const LoginPage = lazyNamedExport(() => import('./pages/LoginPage'), 'LoginPage');
const ForgotPasswordPage = lazyNamedExport(() => import('./pages/ForgotPasswordPage'), 'ForgotPasswordPage');
const UpdatePasswordPage = lazyNamedExport(() => import('./pages/UpdatePasswordPage'), 'UpdatePasswordPage');

export const authRoutes: RouteDefinition[] = [
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/forgot-password',
    element: <ForgotPasswordPage />,
  },
  {
    path: '/update-password',
    element: <UpdatePasswordPage />,
  },
];
