import type { ModuleDefinition } from '@/shared/types/module';
import { adminRoutes } from './routes';

const moduleDefinition: ModuleDefinition = {
  id: 'admin',
  name: 'Admin',
  navGroup: 'admin',
  permissions: ['admin'],
  routes: adminRoutes,
  sidebar: true,
  featureFlag: 'admin_module',
  order: 10,
  children: [
    { path: '/admin', label: 'Overview', icon: 'overview' },
    { path: '/admin/users', label: 'User Management', icon: 'users' },
    { path: '/admin/reports', label: 'Data Entry & Reports', icon: 'reports' },
  ],
};

export default moduleDefinition;
