import type { ModuleDefinition } from '@/shared/types/module';
import { grRoutes } from './routes';

const moduleDefinition: ModuleDefinition = {
  id: 'gr_repository',
  name: 'GR Repository',
  icon: 'file-text',
  navGroup: 'tools',
  permissions: ['office'],
  routes: grRoutes,
  sidebar: true,
  featureFlag: 'gr_repository_module',
  order: 6,
  children: [
    {
      path: '/gr-repository',
      label: 'GR Repository',
      icon: 'file-text',
      subtitle: 'Search, view and manage Government Resolutions',
    },
  ],
};

export default moduleDefinition;
