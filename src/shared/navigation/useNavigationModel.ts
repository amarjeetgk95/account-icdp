import { useMemo } from 'react';
import { usePermissions } from '@/core/permissions/hooks';
import type { ModuleDefinition } from '@/shared/types/module';
import { buildNavigationModel, type NavigationModel } from './model';

export function useNavigationModel(modules: ModuleDefinition[]): NavigationModel {
  const { isAdmin, isLoading } = usePermissions();
  return useMemo(
    () => buildNavigationModel(modules, { isAdmin, isLoading }),
    [modules, isAdmin, isLoading]
  );
}