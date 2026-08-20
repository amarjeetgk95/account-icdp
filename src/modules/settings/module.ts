import type { ModuleDefinition } from '@/shared/types/module';
import { settingsRoutes } from './routes';

const moduleDefinition: ModuleDefinition = {
  id: 'settings',
  name: 'TDS Settings',
  icon: 'settings',
  navGroup: 'tds',
  permissions: ['office'],
  routes: settingsRoutes,
  sidebar: true,
  featureFlag: 'settings_module',
  order: 4,
  children: [
    {
      path: '/settings/office',
      label: 'Office Details',
      icon: 'settings',
      subtitle: 'Office profile, TAN, GST & contact info',
    },
  ],
};

export default moduleDefinition;
