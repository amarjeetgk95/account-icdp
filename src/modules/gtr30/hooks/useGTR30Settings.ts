import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { gtr30SettingsService } from '../services/gtr30Settings.service';
import {
  invalidateGtr30Queries,
} from '@/shared/utilities/gtr30Query';

const SETTINGS_KEY = ['gtr30Settings'] as const;

export function gtr30SettingsQueryKey(): readonly unknown[] {
  return SETTINGS_KEY;
}

export function useGTR30Settings() {
  return useQuery({
    queryKey: SETTINGS_KEY,
    queryFn: () => Promise.resolve(gtr30SettingsService.loadSettings()),
    initialData: () => gtr30SettingsService.getDefaults(),
    staleTime: Infinity,
    gcTime: Infinity,
  });
}

export function useSaveGTR30Settings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      settings: Parameters<typeof gtr30SettingsService.saveSettings>[0]['settings'];
      employeeTemplate: Parameters<
        typeof gtr30SettingsService.saveSettings
      >[0]['employeeTemplate'];
      defaultPosts: Parameters<typeof gtr30SettingsService.saveSettings>[0]['defaultPosts'];
    }) => Promise.resolve(gtr30SettingsService.saveSettings(input)),
    onSuccess: () => {
      void invalidateGtr30Queries(queryClient);
    },
  });
}

export function useResetGTR30Settings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => Promise.resolve(gtr30SettingsService.resetSettings()),
    onSuccess: (data) => {
      queryClient.setQueryData(SETTINGS_KEY, data);
      void invalidateGtr30Queries(queryClient);
    },
  });
}
