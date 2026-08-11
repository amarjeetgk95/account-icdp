import { lazy } from 'react';
import type { RouteDefinition } from '@/shared/types/module';

const AdminAuditPage = lazy(() =>
  import('./pages/AdminAuditPage').then((m) => ({ default: m.AdminAuditPage }))
);

export const adminAuditRoutes: RouteDefinition[] = [
  {
    path: '/admin/audit',
    element: <AdminAuditPage />,
  },
];
