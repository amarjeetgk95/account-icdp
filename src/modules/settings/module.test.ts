import { describe, expect, it } from 'vitest';
import moduleDefinition from './module';
import { settingsRoutes } from './routes';

describe('settings module contract', () => {
  it('exports a ModuleDefinition configured under system navGroup', () => {
    expect(moduleDefinition).toBeDefined();
    expect(moduleDefinition.id).toBe('settings');
    expect(moduleDefinition.name).toBe('Master Settings');
    expect(moduleDefinition.icon).toBe('settings');
    expect(moduleDefinition.navGroup).toBe('system');
    expect(moduleDefinition.permissions).toEqual(['office']);
    expect(moduleDefinition.featureFlag).toBe('settings_module');
    expect(moduleDefinition.sidebar).toBe(true);
    expect(moduleDefinition.order).toBe(9);
  });

  it('declares settings routes and sidebar children for all modules', () => {
    expect(Array.isArray(settingsRoutes)).toBe(true);
    expect(settingsRoutes.length).toBeGreaterThan(0);
    const childPaths = (moduleDefinition.children ?? []).map((c) => c.path);
    expect(childPaths).toContain('/settings/office');
    expect(childPaths).toContain('/settings/gtr30');
    expect(childPaths).toContain('/settings/gtr44');
    expect(childPaths).not.toContain('/settings/establishment');
    expect(childPaths).toContain('/settings/tax-rules');
    expect(childPaths).toContain('/settings/form16');
  });

  it('every sidebar child has label and icon', () => {
    for (const child of moduleDefinition.children ?? []) {
      expect(child.label).toBeTruthy();
      expect(child.icon).toBeTruthy();
    }
  });
});
