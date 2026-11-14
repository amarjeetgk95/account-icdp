import { describe, it, expect } from 'vitest';
import moduleDefinition from './module';

describe('GR Repository Module Definition', () => {
  it('has valid module metadata and permissions', () => {
    expect(moduleDefinition.id).toBe('gr_repository');
    expect(moduleDefinition.name).toBe('GR Repository');
    expect(moduleDefinition.permissions).toEqual(['office']);
    expect(moduleDefinition.navGroup).toBe('tools');
    expect(moduleDefinition.featureFlag).toBe('gr_repository_module');
    expect(moduleDefinition.sidebar).toBe(true);
  });

  it('defines the /gr-repository route', () => {
    expect(moduleDefinition.routes.length).toBeGreaterThan(0);
    const paths = moduleDefinition.routes.map((r) => r.path);
    expect(paths).toContain('/gr-repository');
  });

  it('includes sidebar child link', () => {
    expect(moduleDefinition.children).toBeDefined();
    expect(moduleDefinition.children?.length).toBeGreaterThan(0);
    expect(moduleDefinition.children?.[0].path).toBe('/gr-repository');
  });
});
