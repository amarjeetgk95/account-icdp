import { useState, useCallback } from 'react';
import type { DetectedComponentInfo } from '../../types';

/**
 * Components detected in the PDF header that did not match the master.
 * Surfaced to the user so they can add them to the Component Master.
 */
export function useUnknownComponents() {
  const [unknownComponents, setUnknownComponents] = useState<DetectedComponentInfo[]>([]);

  const captureUnknownComponents = useCallback((parsed: {
    detectedComponents?: DetectedComponentInfo[];
  }) => {
    const unknowns = (parsed.detectedComponents || []).filter(
      (c) => c.matchMethod === 'UNKNOWN'
    );
    setUnknownComponents(unknowns);
  }, []);

  const dismissUnknownComponent = useCallback((componentCode: string) => {
    setUnknownComponents((prev) =>
      prev.filter((c) => c.componentCode !== componentCode)
    );
  }, []);

  const resetUnknownComponents = useCallback(() => setUnknownComponents([]), []);

  return {
    unknownComponents,
    captureUnknownComponents,
    dismissUnknownComponent,
    resetUnknownComponents,
  };
}
