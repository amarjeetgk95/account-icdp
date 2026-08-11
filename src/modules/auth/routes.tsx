import type { RouteDefinition } from '@/shared/types/module';
import { lazy } from 'react';

const LoginPage = lazy(() => import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const AdminLoginPage = lazy(() => import('./pages/AdminLoginPage').then((m) => ({ default: m.AdminLoginPage })));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })));
const UpdatePasswordPage = lazy(() => import('./pages/UpdatePasswordPage').then((m) => ({ default: m.UpdatePasswordPage })));

export const authRoutes: RouteDefinition[] = [
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/login/admin',
    element: <AdminLoginPage />,
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
