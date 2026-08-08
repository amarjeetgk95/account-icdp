import { Routes as RouterRoutes, Route, Navigate } from 'react-router-dom';
import type { ModuleDefinition } from '@/shared/types/module';
import { usePermissions } from '@/core/permissions/hooks';
import { isModuleEnabled } from '@/core/feature-flags/store';

interface RoutesProps {
  modules: ModuleDefinition[];
}

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );
}

export function Routes({ modules }: RoutesProps) {
  const { isAdmin, isLoading } = usePermissions();

  if (isLoading) {
    return <LoadingFallback />;
  }

  return (
    <RouterRoutes>
      {modules.map((module) => {
        if (!module.featureFlag || !isModuleEnabled(module.featureFlag)) {
          return null;
        }

        if (module.permissions?.includes('admin') && !isAdmin) {
          return null;
        }

        if (module.permissions?.includes('admin') && isAdmin) {
          return module.routes.map((route) => (
            <Route
              key={`${module.id}-${route.path}`}
              path={route.path}
              element={route.element}
            />
          ));
        }

        if (!module.permissions?.includes('admin') && isAdmin) {
          return null;
        }

        return module.routes.map((route) => (
          <Route
            key={`${module.id}-${route.path}`}
            path={route.path}
            element={route.element}
          />
        ));
      })}

      <Route path="/" element={<Navigate to={isAdmin ? '/admin' : '/dashboard'} replace />} />
      <Route path="*" element={<NotFound />} />
    </RouterRoutes>
  );
}

function NotFound() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-700">404</h2>
        <p className="text-slate-500 mt-2">Page not found</p>
      </div>
    </div>
  );
}
