import type { ReactNode } from 'react';

export type UserRole = 'admin' | 'office';

export type NavGroup = 'main' | 'admin' | 'reports';

export interface RouteDefinition {
  path: string;
  element: ReactNode;
  children?: RouteDefinition[];
}

export interface ModuleDefinition {
  id: string;
  name: string;
  icon?: string;
  navGroup: NavGroup;
  permissions?: UserRole[];
  featureFlag?: keyof FeatureFlagKeys;
  routes: RouteDefinition[];
  sidebar?: boolean;
  order?: number;
}

export interface FeatureFlagKeys {
  auth_module: boolean;
  admin_module: boolean;
  dashboard_module: boolean;
  settings_module: boolean;
  payroll_module: boolean;
  parties_module: boolean;
  reports_module: boolean;
}
