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
      path: '/establishment/posts',
      label: 'Post Management',
      icon: 'layers',
      subtitle: 'Section 1: Position-number based sanctioned posts, vacancies and post strength',
    },
    {
      path: '/establishment/employees',
      label: 'Employee Register',
      icon: 'users',
      subtitle: 'Section 2: HRPN based staff directory and TDS/Form 16 data',
    },
    {
      path: '/establishment/posts/master',
      label: 'Post & Pay Scales',
      icon: 'award',
      subtitle: 'Sanctioned post names, 7th Pay Commission pay levels, pay scales and cadre class management',
    },
    {
      path: '/establishment/reports',
      label: 'Statutory Reports',
      icon: 'file-text',
      subtitle: 'Official 9-column form and post-wise summary report',
    },
    {
      path: '/establishment/parity',
      label: 'Register Parity',
      icon: 'file-text',
      subtitle: 'Reconciliation check between establishment and payroll registers',
    },
  ],
};

export default moduleDefinition;
