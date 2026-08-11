import { useEffect } from 'react';

/**
 * Hook to warn users before closing/refreshing the browser tab when unsaved changes exist.
 *
 * @param isDirty Boolean indicating whether unsaved edits exist
 * @param message Custom alert message for navigation attempts
 */
export function useUnsavedChanges(isDirty: boolean, message = 'You have unsaved changes. Are you sure you want to leave?') {
  useEffect(() => {
    if (!isDirty) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = message;
      return message;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty, message]);
}
