import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

/**
 * React.lazy wrapper for page components that are exported by name.
 *
 * Guards against stale/mismatched chunks after a deploy: if the chunk loads
 * but the expected named export is missing (or the module namespace is
 * undefined), throws an error that `isChunkLoadError` recognizes so the
 * ErrorBoundary auto-reloads once to pick up the fresh bundle.
 */
export function lazyNamedExport<P = Record<string, never>>(
  loader: () => Promise<unknown>,
  exportName: string
): LazyExoticComponent<ComponentType<P>> {
  return lazy(() =>
    loader().then((m) => {
      const page = (m as Record<string, unknown> | undefined)?.[exportName];
      if (!page || (typeof page !== 'function' && typeof page !== 'object')) {
        throw new Error(
          `Failed to fetch dynamically imported module: "${exportName}" is missing from the chunk (stale build).`
        );
      }
      return { default: page as ComponentType<P> };
    })
  );
}
