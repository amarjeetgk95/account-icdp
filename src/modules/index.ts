import type { ModuleDefinition } from '@/shared/types/module';

const moduleFiles = import.meta.glob('./**/module.ts', { eager: true });

export function useModules(): ModuleDefinition[] {
  const modules: ModuleDefinition[] = [];

  for (const [path, mod] of Object.entries(moduleFiles)) {
    const moduleExport = mod as { default?: ModuleDefinition };
    if (moduleExport.default) {
      modules.push(moduleExport.default);
    } else {
      console.warn(`[Modules] No default export found in ${path}`);
    }
  }

  return modules.sort((a, b) => (a.order || 0) - (b.order || 0));
}

export function getModuleById(id: string): ModuleDefinition | undefined {
  const modules = useModules();
  return modules.find((m) => m.id === id);
}
