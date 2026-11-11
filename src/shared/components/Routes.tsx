import { Routes as RouterRoutes, Route, Navigate } from 'react-router-dom';
import type { ModuleDefinition } from '@/shared/types/module';
import { isModuleEnabled } from '@/core/feature-flags/store';
import { ProtectedRoute } from './ProtectedRoute';

interface RoutesProps {
  modules: ModuleDefinition[];
}

export function Routes({ modules }: RoutesProps) {
  // AuthGate is the single shell blocker (isRoleLoaded). ProtectedRoute
  // still enforces per-route auth; no duplicate loading gate here.
  return (
    <RouterRoutes>
      {modules.map((module) => {
        if (module.featureFlag && !isModuleEnabled(module.featureFlag)) {
          return null;
        }

        return module.routes.map((route) => (
          <Route
            key={`${module.id}-${route.path}`}
            path={route.path}
            element={<ProtectedRoute>{route.element}</ProtectedRoute>}
          />
        ));
      })}

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard.html" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login.html" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<NotFound />} />
    </RouterRoutes>
  );
}

function NotFound() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <h2 className="text-xs font-bold text-slate-700 dark:text-slate-200">404</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-2">Page not found</p>
      </div>
    </div>
  );
}
