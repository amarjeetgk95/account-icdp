import type { ModuleDefinition } from '@/shared/types/module';
import { adminAuditRoutes } from './routes';

const moduleDefinition: ModuleDefinition = {
  id: 'adminaudit',
  name: 'Audit Logs',
  navGroup: 'admin',
  permissions: ['admin'],
  routes: adminAuditRoutes,
  sidebar: true,
  featureFlag: 'adminaudit_module',
  order: 20,
  children: [
    {
      path: '/admin/audit',
      label: 'Audit Trail',
      icon: 'audit',
      subtitle: 'System-wide activity logs, user operations, and security audit trail',
    },
  ],
};

export default moduleDefinition;
