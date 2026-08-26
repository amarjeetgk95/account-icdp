import { useQuery } from '@tanstack/react-query';
import { paybillRepository } from '../repositories/paybill.repository';
import { PAYBILL_QUERY_KEY_ROOT } from './invalidatePaybillData';

type ManualValuesMap = Record<string, Record<string, Record<string, number>>>;

export type PrevYearAggMap = Map<string, { gross: number; net: number }>;

const EMPTY_PREV_YEAR: PrevYearAggMap = new Map();

/**
 * Per-employee ledger data, scoped to the selected HRPN so each query fetches
 * O(selected employee) rows instead of the whole office. Config (settings +
 * manual values) is office-wide and cached indefinitely; invalidation is
 * explicit via invalidatePaybillData.
 */
export function useEmployeeLedger(financialYear: number, hrpn: string | null) {
  const earningsQuery = useQuery({
    queryKey: [PAYBILL_QUERY_KEY_ROOT, 'earnings', { financialYear, hrpn }],
    queryFn: () => paybillRepository.listEarnings({ financialYear, hrpn: hrpn ?? undefined }),
    enabled: !!hrpn,
    staleTime: 60_000,
  });

  const deductionsQuery = useQuery({
    queryKey: [PAYBILL_QUERY_KEY_ROOT, 'deductions', { financialYear, hrpn }],
    queryFn: () => paybillRepository.listDeductions({ financialYear, hrpn: hrpn ?? undefined }),
    enabled: !!hrpn,
    staleTime: 60_000,
  });

  const configQuery = useQuery({
    queryKey: [PAYBILL_QUERY_KEY_ROOT, 'ledgerConfig'],
    queryFn: async () => {
      const [settings, manualValues] = await Promise.all([
        paybillRepository.getSettings(),
        paybillRepository.getManualLedgerValues(),
      ]);
      return { settings, manualValues };
    },
    staleTime: Infinity,
  });

  // Previous-FY aggregate for YoY hints. Best-effort: a failure here must
  // never surface or block the current-FY ledger (status quo behaviour).
  const prevYearQuery = useQuery({
    queryKey: [PAYBILL_QUERY_KEY_ROOT, 'prevYear', { hrpn }],
    queryFn: async (): Promise<PrevYearAggMap> => {
      try {
        const [prevEarnings, prevDeductions] = await Promise.all([
          paybillRepository.listEarnings({ financialYear: financialYear - 1, hrpn: hrpn ?? undefined }).catch(() => []),
          paybillRepository.listDeductions({ financialYear: financialYear - 1, hrpn: hrpn ?? undefined }).catch(() => []),
        ]);
        const agg: PrevYearAggMap = new Map();
        for (const r of prevEarnings) {
          const s = agg.get(r.hrpn) || { gross: 0, net: 0 };
          s.gross += r.grossAmount || 0;
          agg.set(r.hrpn, s);
        }
        for (const r of prevDeductions) {
          const s = agg.get(r.hrpn) || { gross: 0, net: 0 };
          s.net += r.netPay || 0;
          agg.set(r.hrpn, s);
        }
        return agg;
      } catch {
        return EMPTY_PREV_YEAR;
      }
    },
    enabled: !!hrpn,
    retry: false,
    staleTime: Infinity,
  });

  const refetchAll = () =>
    Promise.all([
      earningsQuery.refetch(),
      deductionsQuery.refetch(),
      configQuery.refetch(),
      prevYearQuery.refetch(),
    ]);

  return {
    earnings: earningsQuery.data ?? [],
    deductions: deductionsQuery.data ?? [],
    settings: configQuery.data?.settings ?? null,
    manualValues: configQuery.data?.manualValues ?? ({} as ManualValuesMap),
    prevYearAgg: prevYearQuery.data ?? EMPTY_PREV_YEAR,
    isLoading:
      earningsQuery.isLoading || deductionsQuery.isLoading || configQuery.isLoading,
    isFetching:
      earningsQuery.isFetching ||
      deductionsQuery.isFetching ||
      configQuery.isFetching ||
      prevYearQuery.isFetching,
    // Aggregated failure state across the ledger queries (prev-year never fails).
    isError: earningsQuery.isError || deductionsQuery.isError || configQuery.isError,
    error: earningsQuery.error ?? deductionsQuery.error ?? configQuery.error,
    refetchAll,
  };
}
