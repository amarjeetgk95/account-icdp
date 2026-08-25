import { Navigate } from 'react-router-dom';
import { lazyNamedExport } from '@/shared/utilities/lazyNamed';
import type { RouteDefinition } from '@/shared/types/module';

const GTR44ListPage = lazyNamedExport(() => import('./pages/GTR44ListPage'), 'GTR44ListPage');
const GTR44CreatePage = lazyNamedExport(() => import('./pages/GTR44CreatePage'), 'GTR44CreatePage');
const GTR44ViewPage = lazyNamedExport(() => import('./pages/GTR44ViewPage'), 'GTR44ViewPage');

export const gtr44Routes: RouteDefinition[] = [
  {
    path: '/gtr44/settings',
    element: <Navigate to="/settings/gtr44" replace />,
  },
  {
    path: '/gtr44/list',
    element: <GTR44ListPage />,
  },
  {
    path: '/gtr44/create',
    element: <GTR44CreatePage />,
  },
  {
    path: '/gtr44/edit/:id',
    element: <GTR44CreatePage />,
  },
  {
    path: '/gtr44/view/:id',
    element: <GTR44ViewPage />,
  },
];
