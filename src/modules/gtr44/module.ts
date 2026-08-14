import type { ModuleDefinition } from '@/shared/types/module';
import { gtr44Routes } from './routes';

const moduleDefinition: ModuleDefinition = {
  id: 'gtr44',
  name: 'GTR-44 DC Bills',
  navGroup: 'bills',
  permissions: ['office'],
  routes: gtr44Routes,
  sidebar: true,
  featureFlag: 'gtr44_module',
  order: 3,
};

export default moduleDefinition;
