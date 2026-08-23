import { useState, useCallback } from 'react';
import {
  popupNativePrint,
  printElement,
  printMultipleContainers,
  NativePrintOptions,
} from '../utilities/nativePrint';

export interface UseNativePrintReturn {
  isPrinting: boolean;
  print: (options: NativePrintOptions) => boolean;
  printElementById: (elementId: string, options?: Partial<NativePrintOptions>) => boolean;
  printMultipleByIds: (elementIds: string[], options?: Partial<NativePrintOptions>) => boolean;
}

/**
 * React hook to trigger popup-isolated native print with dynamic CSS auto-fitting.
 */
export function useNativePrint(): UseNativePrintReturn {
  const [isPrinting, setIsPrinting] = useState(false);

  const print = useCallback((options: NativePrintOptions): boolean => {
    try {
      setIsPrinting(true);
      const win = popupNativePrint(options);
      return win !== null;
    } catch (err) {
      console.error('useNativePrint failed:', err);
      return false;
    } finally {
      setIsPrinting(false);
    }
  }, []);

  const printElementById = useCallback(
    (elementId: string, options?: Partial<NativePrintOptions>): boolean => {
      try {
        setIsPrinting(true);
        const win = printElement(elementId, options);
        return win !== null;
      } catch (err) {
        console.error('useNativePrint printElementById failed:', err);
        return false;
      } finally {
        setIsPrinting(false);
      }
    },
    []
  );

  const printMultipleByIds = useCallback(
    (elementIds: string[], options?: Partial<NativePrintOptions>): boolean => {
      try {
        setIsPrinting(true);
        const win = printMultipleContainers(elementIds, options);
        return win !== null;
      } catch (err) {
        console.error('useNativePrint printMultipleByIds failed:', err);
        return false;
      } finally {
        setIsPrinting(false);
      }
    },
    []
  );

  return {
    isPrinting,
    print,
    printElementById,
    printMultipleByIds,
  };
}
