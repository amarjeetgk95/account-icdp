import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { gtr30SettingsService } from '../services/gtr30Settings.service';
import {
  getGtr30SettingsSyncStatus,
  subscribeGtr30SettingsSync,
  type Gtr30SettingsSyncPhase,
} from '../services/gtr30Settings.service';
import {
  invalidateGtr30Queries,
} from '@/shared/utilities/gtr30Query';
import { useActiveOfficeId } from '@/shared/hooks/useActiveOfficeId';
import { resolveDARateForMonthKey, normalizeDARates, DEFAULT_DA_PERCENT } from '../utils/gtr30GovRules';

function gtr30SettingsKey(officeId: string | null | undefined): readonly unknown[] {
  return ['gtr30Settings', officeId ?? null];
}

export function useGTR30Settings() {
  const queryClient = useQueryClient();
  const officeId = useActiveOfficeId();

  useEffect(() => {
    void gtr30SettingsService
      .hydrateFromBackend()
      .then(() => {
        queryClient.invalidateQueries({ queryKey: gtr30SettingsKey(officeId) });
      })
      .catch(() => {});
  }, [officeId, queryClient]);

  return useQuery({
    queryKey: gtr30SettingsKey(officeId),
    queryFn: () => Promise.resolve(gtr30SettingsService.loadSettings()),
    initialData: () => gtr30SettingsService.getDefaults(),
    staleTime: Infinity,
    gcTime: Infinity,
  });
}

export function useSaveGTR30Settings() {
  const queryClient = useQueryClient();
  const officeId = useActiveOfficeId();

  return useMutation({
    mutationFn: (input: {
      settings: Parameters<typeof gtr30SettingsService.saveSettings>[0]['settings'];
      employeeTemplate: Parameters<
        typeof gtr30SettingsService.saveSettings
      >[0]['employeeTemplate'];
      defaultPosts: Parameters<typeof gtr30SettingsService.saveSettings>[0]['defaultPosts'];
      daRates?: Parameters<typeof gtr30SettingsService.saveSettings>[0]['daRates'];
    }) => Promise.resolve(gtr30SettingsService.saveSettings(input as Parameters<typeof gtr30SettingsService.saveSettings>[0])),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gtr30SettingsKey(officeId) });
      void invalidateGtr30Queries(queryClient);
    },
  });
}

export function useSaveGTR30DaRates() {
  const queryClient = useQueryClient();
  const officeId = useActiveOfficeId();
  return useMutation({
    mutationFn: (daRates: Parameters<typeof gtr30SettingsService.saveDaRates>[0]) =>
      Promise.resolve(gtr30SettingsService.saveDaRates(daRates)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: gtr30SettingsKey(officeId) });
      void invalidateGtr30Queries(queryClient);
    },
  });
}

export function useEffectiveDARate(monthKeyOrIso?: string | null): number {
  const { data: payload } = useGTR30Settings();
  const rates = payload?.daRates ?? [];
  const normalized = normalizeDARates(rates);
  if (normalized.length === 0) return DEFAULT_DA_PERCENT;
  if (!monthKeyOrIso) return normalized[normalized.length - 1].rate;
  return resolveDARateForMonthKey(rates, monthKeyOrIso);
}

export function useResetGTR30Settings() {
  const queryClient = useQueryClient();
  const officeId = useActiveOfficeId();

  return useMutation({
    mutationFn: () => Promise.resolve(gtr30SettingsService.resetSettings()),
    onSuccess: (data) => {
      queryClient.setQueryData(gtr30SettingsKey(officeId), data);
      void invalidateGtr30Queries(queryClient);
    },
  });
}

export function useGTR30SettingsSyncStatus(): Gtr30SettingsSyncPhase {
  const [phase, setPhase] = useState<Gtr30SettingsSyncPhase>(() =>
    getGtr30SettingsSyncStatus()
  );
  useEffect(
    () => subscribeGtr30SettingsSync(() => setPhase(getGtr30SettingsSyncStatus())),
    []
  );
  return phase;
}