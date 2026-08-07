import type { ModuleDefinition } from '@/shared/types/module';
import { authRoutes } from './routes';

const moduleDefinition: ModuleDefinition = {
  id: 'auth',
  name: 'Authentication',
  icon: '🔐',
  navGroup: 'main',
  routes: authRoutes,
  sidebar: false,
  featureFlag: 'auth_module',
};

export default moduleDefinition;
