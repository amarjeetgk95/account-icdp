import type { ReactNode } from 'react';

export type UserRole = 'admin' | 'office';

export type NavGroup = 'overview' | 'bills' | 'tds' | 'it-employee' | 'system' | 'admin' | 'main';

export interface RouteDefinition {
  path: string;
  element: ReactNode;
  children?: RouteDefinition[];
}

export interface SidebarChild {
  path: string;
  label: string;
  icon?: string;
  subtitle?: string;
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
  children?: SidebarChild[];
}

export interface FeatureFlagKeys {
  auth_module: boolean;
  admin_module: boolean;
  adminaudit_module: boolean;
  dashboard_module: boolean;
  settings_module: boolean;
  payroll_module: boolean;
  parties_module: boolean;
  reports_module: boolean;
  gtr44_module: boolean;
  gtr30_module: boolean;
  paybill_module: boolean;
  paybill_component_master: boolean;
}
