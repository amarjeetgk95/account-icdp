import type { ModuleDefinition } from '@/shared/types/module';
import { gtr30Routes } from './routes';

const moduleDefinition: ModuleDefinition = {
  id: 'gtr30',
  name: 'GTR-30 Pay Bills',
  icon: 'receipt',
  navGroup: 'bills',
  permissions: ['office'],
  routes: gtr30Routes,
  sidebar: true,
  featureFlag: 'gtr30_module',
  order: 2,
  children: [
    {
      path: '/gtr30/create',
      label: 'Create Pay Bill',
      icon: 'file-plus',
      subtitle: 'Build a pay bill using the 10-page official government format',
    },
    {
      path: '/gtr30/list',
      label: 'Pay Bill Register',
      icon: 'receipt',
      subtitle: 'View, edit, duplicate, and export registered pay bills',
    },
    {
      path: '/gtr30/employee-management',
      label: 'Employee Management',
      icon: 'users',
      subtitle: 'Manage employee directory, 7th pay scales, allowances, and bill codes',
    },
    {
      path: '/gtr30/settings',
      label: 'Bill Settings',
      icon: 'settings',
      subtitle: 'Office, treasury, bill code creation, and reusable defaults',
    },
  ],
};

export default moduleDefinition;

export const gtr30ModuleDefinition = moduleDefinition;
