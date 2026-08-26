import type { ModuleDefinition } from '@/shared/types/module';
import { settingsRoutes } from './routes';

const moduleDefinition: ModuleDefinition = {
  id: 'settings',
  name: 'Master Settings',
  icon: 'settings',
  navGroup: 'system',
  permissions: ['office'],
  routes: settingsRoutes,
  sidebar: true,
  featureFlag: 'settings_module',
  order: 9,
  children: [
    {
      path: '/settings/office',
      label: 'Office & DDO Master',
      icon: 'settings',
      subtitle: 'Office profile, TAN, GST, DDO code, treasury & contact info',
    },
    {
      path: '/settings/gtr30',
      label: 'GTR-30 Pay Bill Defaults',
      icon: 'file-spreadsheet',
      subtitle: 'Budget heads, DA rates, DDO signatory, and employee template',
    },
    {
      path: '/settings/gtr44',
      label: 'GTR-44 DC Bill Defaults',
      icon: 'receipt',
      subtitle: '22 Expenditure items, EDP codes, numbering, and print layout',
    },
    {
      path: '/settings/tax-rules',
      label: 'Income Tax Slabs (115BAC)',
      icon: 'calculator',
      subtitle: 'New tax regime slabs, standard deduction, 87A rebate ceilings',
    },
    {
      path: '/settings/form16',
      label: 'Form 16 Deductor & Officer',
      icon: 'file-text',
      subtitle: 'Common deductor & signatory details for certificates',
    },
  ],
};

export default moduleDefinition;

