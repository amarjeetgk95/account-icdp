import type { ModuleDefinition } from '@/shared/types/module';
import { gtr44Routes } from './routes';

const moduleDefinition: ModuleDefinition = {
  id: 'gtr44',
  name: 'GTR-44 DC Bills',
  icon: 'receipt',
  navGroup: 'bills',
  permissions: ['office'],
  routes: gtr44Routes,
  sidebar: true,
  featureFlag: 'gtr44_module',
  order: 1,
  children: [
    { path: '/gtr44/create', label: 'Create DC Bill', icon: 'file-plus' },
    { path: '/gtr44/list', label: 'Bills Register', icon: 'receipt' },
    { path: '/gtr44/settings', label: 'Bill Settings', icon: 'settings' },
  ],
};

export default moduleDefinition;
