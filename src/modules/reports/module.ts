import type { ModuleDefinition } from '@/shared/types/module';
import { reportsRoutes } from './routes';

const moduleDefinition: ModuleDefinition = {
  id: 'reports',
  name: 'TDS Reports & Returns',
  icon: 'reports',
  navGroup: 'tds',
  permissions: ['office'],
  routes: reportsRoutes,
  sidebar: true,
  featureFlag: 'reports_module',
  order: 3,
  children: [
    { path: '/reports/24q', label: '24Q Employee', icon: 'file-text' },
    { path: '/reports/26q', label: '26Q Vendor IT', icon: 'calculator' },
    { path: '/reports/gst', label: 'GST Annual', icon: 'sliders' },
  ],
};

export default moduleDefinition;
