import type { ModuleDefinition } from '@/shared/types/module';

const moduleFiles = import.meta.glob('./**/module.ts', { eager: true });

const modules: ModuleDefinition[] = [];

for (const [path, mod] of Object.entries(moduleFiles)) {
  const moduleExport = mod as { default?: ModuleDefinition };
  if (moduleExport.default) {
    modules.push(moduleExport.default);
  } else {
    console.warn(`[Modules] No default export found in ${path}`);
  }
}

modules.sort((a, b) => (a.order || 0) - (b.order || 0));

export function useModules(): ModuleDefinition[] {
  return modules;
}
