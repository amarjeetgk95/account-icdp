import { useEffect } from 'react';

export function useForceLightTheme() {
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.remove('dark');
    }
  }, []);
}
