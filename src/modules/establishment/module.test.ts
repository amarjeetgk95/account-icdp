import { describe, expect, it } from 'vitest';
import moduleDefinition from './module';

describe('Establishment module definition', () => {
  it('has the correct identity', () => {
    expect(moduleDefinition.id).toBe('establishment');
    expect(moduleDefinition.name).toBe('Establishment');
    expect(moduleDefinition.navGroup).toBe('establishment');
  });

  it('exposes directory and registration routes', () => {
    const paths = moduleDefinition.routes.map((r) => r.path);
    expect(paths).toContain('/establishment');
    expect(paths).toContain('/establishment/employees/new');
    expect(paths).toContain('/establishment/employees/edit/:id');
  });

  it('lists sidebar children', () => {
    expect(moduleDefinition.children?.length).toBeGreaterThan(0);
    expect(moduleDefinition.children?.[0].path).toBe('/establishment');
  });
});
