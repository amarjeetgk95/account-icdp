import type { ModuleDefinition } from '@/shared/types/module';
import { partiesRoutes } from './routes';

const moduleDefinition: ModuleDefinition = {
  id: 'parties',
  name: 'Vendor TDS (26Q)',
  icon: 'parties',
  navGroup: 'tds',
  permissions: ['office'],
  routes: partiesRoutes,
  sidebar: true,
  featureFlag: 'parties_module',
  order: 2,
  children: [
    { path: '/parties/overview', label: 'Overview', icon: 'overview' },
    { path: '/parties/gst', label: 'GST Report', icon: 'file-text' },
    { path: '/parties/it', label: '26Q Income Tax', icon: 'calculator' },
  ],
};

export default moduleDefinition;
