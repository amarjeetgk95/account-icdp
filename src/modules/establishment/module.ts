import type { ModuleDefinition } from '@/shared/types/module';
import { establishmentRoutes } from './routes';

const moduleDefinition: ModuleDefinition = {
  id: 'establishment',
  name: 'Establishment',
  icon: 'establishment',
  navGroup: 'establishment',
  permissions: ['office'],
  routes: establishmentRoutes,
  sidebar: true,
  featureFlag: 'establishment_module',
  order: 6,
  children: [
    {
      path: '/establishment',
      label: 'Employee Directory',
      icon: 'users',
      subtitle: 'Canonical staff register with pay history, allowances, and deductions',
    },
    {
      path: '/establishment/posts',
      label: 'Sanctioned Posts (મહેકમ માહિતી)',
      icon: 'layers',
      subtitle: 'Manage sanctioned strength, cadre-wise posts, and vacant positions',
    },
    {
      path: '/establishment/employees/new',
      label: 'Register Employee',
      icon: 'user',
      subtitle: 'Add a new staff member to the establishment register',
    },
  ],
};

export default moduleDefinition;
