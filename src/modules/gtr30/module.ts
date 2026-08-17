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
      path: '/gtr30/employee-master',
      label: 'Employee Master',
      icon: 'users',
      subtitle: 'Per-month, per-bill-code employee salary master data',
    },
    {
      path: '/gtr30/settings',
      label: 'Bill Settings',
      icon: 'settings',
      subtitle: 'Office, treasury, drawing officer, and bill code defaults',
    },
  ],
};

export default moduleDefinition;

export const gtr30ModuleDefinition = moduleDefinition;
