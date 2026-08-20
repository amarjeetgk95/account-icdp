import { describe, expect, it } from 'vitest';
import moduleDefinition, { gtr30ModuleDefinition } from './module';
import { gtr30Routes } from './routes';

describe('gtr30 module contract', () => {
  it('exports a ModuleDefinition with the documented shape', () => {
    expect(moduleDefinition).toBeDefined();
    expect(gtr30ModuleDefinition).toBe(moduleDefinition);
    expect(moduleDefinition.id).toBe('gtr30');
    expect(moduleDefinition.name).toBe('GTR-30 Pay Bills');
    expect(moduleDefinition.navGroup).toBe('bills');
    expect(moduleDefinition.permissions).toEqual(['office']);
    expect(moduleDefinition.featureFlag).toBe('gtr30_module');
    expect(moduleDefinition.sidebar).toBe(true);
    expect(typeof moduleDefinition.order).toBe('number');
  });

  it('routes are wired to the lazy-loaded modules', () => {
    expect(Array.isArray(gtr30Routes)).toBe(true);
    expect(gtr30Routes.length).toBeGreaterThan(0);
    const paths = gtr30Routes.map((r) => r.path);
    expect(paths).toContain('/gtr30/list');
    expect(paths).toContain('/gtr30/create');
    expect(paths).toContain('/gtr30/edit/:id');
    expect(paths).toContain('/gtr30/view/:id');
    expect(paths).toContain('/gtr30/settings');
    expect(paths).toContain('/gtr30/employee-management');
    expect(paths).toContain('/gtr30/employee-management/new');
    expect(paths).toContain('/gtr30/employee-management/edit/:employeeId');
  });

  it('declares every route as a sidebar child', () => {
    const childPaths = (moduleDefinition.children ?? []).map((c) => c.path);
    expect(childPaths).toContain('/gtr30/create');
    expect(childPaths).toContain('/gtr30/list');
    expect(childPaths).toContain('/gtr30/employee-management');
    expect(childPaths).toContain('/gtr30/settings');
  });

  it('every sidebar child has a label and icon', () => {
    for (const child of moduleDefinition.children ?? []) {
      expect(child.label).toBeTruthy();
      expect(child.icon).toBeTruthy();
      expect(child.subtitle).toBeTruthy();
    }
  });
});
