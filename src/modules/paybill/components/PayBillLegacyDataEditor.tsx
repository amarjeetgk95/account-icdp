import { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { paybillRepository } from '../repositories/paybill.repository';
import { PAYBILL_EARNING_COLUMNS, PAYBILL_DEDUCTION_COLUMNS } from '../services/paybillReport.service';
import { establishmentService } from '@/modules/establishment/services/establishment.service';
import type { EstablishmentEmployee } from '@/modules/establishment/types';
import { latestPayOf, servesInFinancialYear } from '@/modules/establishment/types';
import { Search, Save, Database, Calendar, Copy, Sparkles, RotateCcw } from 'lucide-react';
import { PbButton, PbPanel } from './ui';
import { WorkspaceHeader } from '@/shared/components/WorkspaceHeader';
import { toast } from '@/shared/components/Toast';
import { useUIStore } from '@/core/stores/ui-store';
import { getOfficeId } from '@/shared/utilities/office';
import type { PayBillStoredEarning, PayBillStoredDeduction } from '../types';

const MONTH_ORDER = [
  'March', 'April', 'May',
  'June', 'July', 'August',
  'September', 'October', 'November',
  'December', 'January', 'February',
];

function findEstablishmentEmployee(
  employees: EstablishmentEmployee[],
  hrpn: string,
  fy: number
): EstablishmentEmployee | null {
  const clean = hrpn.trim().toLowerCase();
  if (!clean) return null;
  const match = employees.find(
    (e) => (e.hrpnNo || '').trim().toLowerCase() === clean && servesInFinancialYear(e, fy)
  );
  return match ?? null;
}

const formatInr = (n: number | undefined) =>
  `₹${Math.round(n || 0).toLocaleString('en-IN')}`;

interface LegacyDataTableProps {
  earningByMonth: Record<string, PayBillStoredEarning>;
  deductionByMonth: Record<string, PayBillStoredDeduction>;
  manualAllowances: string[];
  manualValues: Record<string, Record<string, number>>;
  search: string;
  monthFilter: string[];
  manualImportId: string;
  hrpn: string;
  financialYear: number;
  estEmployee: EstablishmentEmployee | null;
  onUpdateEarning: (month: string, updated: PayBillStoredEarning) => void;
  onUpdateDeduction: (month: string, updated: PayBillStoredDeduction) => void;
  onUpdateManualValues: (label: string, updates: Record<string, number>) => void;
}

function LegacyDataTable({
  earningByMonth,
  deductionByMonth,
  manualAllowances,
  manualValues,
  search,
  monthFilter,
  manualImportId,
  hrpn,
  financialYear,
  estEmployee,
  onUpdateEarning,
  onUpdateDeduction,
  onUpdateManualValues,
}: LegacyDataTableProps) {
  const [draftEarnings, setDraftEarnings] = useState<Record<string, PayBillStoredEarning>>({});
  const [draftDeductions, setDraftDeductions] = useState<Record<string, PayBillStoredDeduction>>({});
  const [draftManual, setDraftManual] = useState<Record<string, Record<string, number>>>({});
  const [dirtyRows, setDirtyRows] = useState<Set<string>>(new Set());
  const [savingRow, setSavingRow] = useState<string | null>(null);
  const officeId = getOfficeId() || '';

  const employeeName =
    earningByMonth[MONTH_ORDER.find((m) => earningByMonth[m]) || '']?.employeeName ||
    deductionByMonth[MONTH_ORDER.find((m) => deductionByMonth[m]) || '']?.employeeName ||
    '';
  const designation =
    earningByMonth[MONTH_ORDER.find((m) => earningByMonth[m]) || '']?.designation ||
    deductionByMonth[MONTH_ORDER.find((m) => deductionByMonth[m]) || '']?.designation ||
    null;

  useEffect(() => {
    setDraftEarnings(earningByMonth);
    setDraftDeductions(deductionByMonth);
    setDraftManual(manualValues);
    setDirtyRows(new Set());
  }, [earningByMonth, deductionByMonth, manualValues]);

  const baseEmployeeInfo = useMemo(() => {
    const base =
      earningByMonth[MONTH_ORDER.find((m) => earningByMonth[m]) || ''] ||
      deductionByMonth[MONTH_ORDER.find((m) => deductionByMonth[m]) || ''];
    const latestPay = estEmployee ? latestPayOf(estEmployee) : undefined;
    return {
      hrpn: estEmployee?.hrpnNo || base?.hrpn || hrpn,
      employeeName: estEmployee?.name || base?.employeeName || employeeName,
      designation: estEmployee?.designation || base?.designation || designation,
      payScale: latestPay?.payScale || estEmployee?.payScale || null,
      employeeId: estEmployee?.id ?? null,
      financialYear: base?.financialYear || financialYear,
    };
  }, [earningByMonth, deductionByMonth, hrpn, employeeName, designation, financialYear, estEmployee]);

  const getMonthManualSum = useCallback((m: string, currentDraftManual = draftManual) => {
    let sum = 0;
    for (const label of manualAllowances) {
      sum += currentDraftManual[label]?.[m] || 0;
    }
    return sum;
  }, [manualAllowances, draftManual]);

  const recalcEarningGross = (
    vals: Partial<PayBillStoredEarning>,
    m: string,
    currentDraftManual = draftManual
  ) => {
    return (
      (vals.basicPay ?? 0) +
      (vals.da ?? 0) +
      (vals.hra ?? 0) +
      (vals.cla ?? 0) +
      (vals.medicalAllowance ?? 0) +
      (vals.transportAllowance ?? 0) +
      (vals.specialPay ?? 0) +
      (vals.washingAllowance ?? 0) +
      (vals.nppAllowance ?? 0) +
      getMonthManualSum(m, currentDraftManual)
    );
  };

  const getMonthGross = useCallback((m: string, currentDraftEarnings = draftEarnings, currentDraftManual = draftManual) => {
    const earnRec = currentDraftEarnings[m];
    const stdSum = earnRec
      ? (earnRec.basicPay || 0) +
        (earnRec.da || 0) +
        (earnRec.hra || 0) +
        (earnRec.cla || 0) +
        (earnRec.medicalAllowance || 0) +
        (earnRec.transportAllowance || 0) +
        (earnRec.specialPay || 0) +
        (earnRec.washingAllowance || 0) +
        (earnRec.nppAllowance || 0)
      : 0;
    return stdSum + getMonthManualSum(m, currentDraftManual);
  }, [draftEarnings, draftManual, getMonthManualSum]);

  const recalcDeductionTotals = (vals: Partial<PayBillStoredDeduction>, gross: number) => {
    const total =
      (vals.incomeTax ?? 0) +
      (vals.profTax ?? 0) +
      (vals.hbaInterest ?? 0) +
      (vals.gpfRegular ?? 0) +
      (vals.gpfClass4 ?? 0) +
      (vals.npsRegular ?? 0) +
      (vals.gisGovtFund ?? 0) +
      (vals.gisGovtSaving ?? 0) +
      (vals.otherDeductions ?? 0);
    return { total, net: gross - total };
  };

  const makeEmptyEarning = (month: string): PayBillStoredEarning => ({
    id: crypto.randomUUID(),
    importId: manualImportId,
    officeId,
    employeeId: baseEmployeeInfo.employeeId,
    hrpn: baseEmployeeInfo.hrpn,
    employeeName: baseEmployeeInfo.employeeName,
    designation: baseEmployeeInfo.designation,
    payScale: baseEmployeeInfo.payScale,
    ph: null,
    slo: null,
    month,
    financialYear: baseEmployeeInfo.financialYear,
    basicPay: 0,
    da: 0,
    hra: 0,
    cla: 0,
    medicalAllowance: 0,
    transportAllowance: 0,
    specialPay: 0,
    washingAllowance: 0,
    nppAllowance: 0,
    otherAllowance: 0,
    grossAmount: getMonthManualSum(month),
    mappingStatus: 'MATCHED',
    createdAt: new Date().toISOString(),
  });

  const makeEmptyDeduction = (month: string): PayBillStoredDeduction => {
    const gross = getMonthGross(month);
    return {
      id: crypto.randomUUID(),
      importId: manualImportId,
      officeId,
      employeeId: baseEmployeeInfo.employeeId,
      hrpn: baseEmployeeInfo.hrpn,
      employeeName: baseEmployeeInfo.employeeName,
      designation: baseEmployeeInfo.designation,
      month,
      financialYear: baseEmployeeInfo.financialYear,
      incomeTax: 0,
      profTax: 0,
      hbaInterest: 0,
      gpfRegular: 0,
      gpfClass4: 0,
      npsRegular: 0,
      gisGovtFund: 0,
      gisGovtSaving: 0,
      otherDeductions: 0,
      totalDeductions: 0,
      netPay: gross,
      mappingStatus: 'MATCHED',
      createdAt: new Date().toISOString(),
    };
  };

  const handleEarningDraftChange = (
    month: string,
    field: keyof PayBillStoredEarning,
    raw: string
  ) => {
    const num = raw === '' ? 0 : Number(raw);
    const safe = Number.isFinite(num) ? num : 0;
    setDraftEarnings((prev) => {
      const rec = prev[month] || makeEmptyEarning(month);
      const patch: Partial<PayBillStoredEarning> = { [field]: safe };
      const updated: PayBillStoredEarning = {
        ...rec,
        ...patch,
        grossAmount: recalcEarningGross({ ...rec, ...patch }, month),
      };
      return { ...prev, [month]: updated };
    });
    setDirtyRows((prev) => new Set(prev).add(`earn-${String(field)}`));
  };

  const handleManualDraftChange = (month: string, label: string, raw: string) => {
    const num = raw === '' ? 0 : Number(raw);
    const safe = Number.isFinite(num) ? num : 0;
    setDraftManual((prev) => {
      const paramMap = prev[label] || {};
      const next = { ...prev, [label]: { ...paramMap, [month]: safe } };
      return next;
    });
    setDirtyRows((prev) => new Set(prev).add(`manual-${label}`));
  };

  const handleDeductionDraftChange = (
    month: string,
    field: keyof PayBillStoredDeduction,
    raw: string
  ) => {
    const num = raw === '' ? 0 : Number(raw);
    const safe = Number.isFinite(num) ? num : 0;
    setDraftDeductions((prev) => {
      const rec = prev[month] || makeEmptyDeduction(month);
      const patch: Partial<PayBillStoredDeduction> = { [field]: safe };
      const gross = getMonthGross(month);
      const { total, net } = recalcDeductionTotals({ ...rec, ...patch }, gross);
      const updated: PayBillStoredDeduction = { ...rec, ...patch, totalDeductions: total, netPay: net };
      return { ...prev, [month]: updated };
    });
    setDirtyRows((prev) => new Set(prev).add(`ded-${String(field)}`));
  };

  const handleCellPaste = (
    e: React.ClipboardEvent<HTMLInputElement>,
    rowKey: string,
    group: 'EARNING' | 'DEDUCTION' | 'MANUAL',
    startMonth: string
  ) => {
    const pasteText = e.clipboardData.getData('text');
    if (!pasteText) return;

    const rawTokens = pasteText
      .split(/[\t\r\n,]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (rawTokens.length <= 1 && !pasteText.includes('\t') && !pasteText.includes('\n')) {
      return;
    }

    e.preventDefault();
    const startIdx = MONTH_ORDER.indexOf(startMonth);
    if (startIdx < 0) return;

    if (group === 'MANUAL') {
      const updates: Record<string, number> = {};
      rawTokens.forEach((token, offset) => {
        const mIdx = startIdx + offset;
        if (mIdx < MONTH_ORDER.length) {
          const m = MONTH_ORDER[mIdx];
          const num = Number(token.replace(/[^\d.-]/g, ''));
          if (!Number.isNaN(num)) {
            updates[m] = num;
          }
        }
      });
      if (Object.keys(updates).length > 0) {
        setDraftManual((prev) => {
          const p = prev[rowKey] || {};
          return { ...prev, [rowKey]: { ...p, ...updates } };
        });
        setDirtyRows((prev) => new Set(prev).add(`manual-${rowKey}`));
        toast.info(`Pasted ${Object.keys(updates).length} month values into ${rowKey}`);
      }
    } else if (group === 'EARNING') {
      const field = rowKey as keyof PayBillStoredEarning;
      setDraftEarnings((prev) => {
        const next = { ...prev };
        rawTokens.forEach((token, offset) => {
          const mIdx = startIdx + offset;
          if (mIdx < MONTH_ORDER.length) {
            const m = MONTH_ORDER[mIdx];
            const num = Number(token.replace(/[^\d.-]/g, ''));
            if (!Number.isNaN(num)) {
              const rec = next[m] || makeEmptyEarning(m);
              const patch = { ...rec, [field]: num };
              next[m] = { ...patch, grossAmount: recalcEarningGross(patch, m) };
            }
          }
        });
        return next;
      });
      setDirtyRows((prev) => new Set(prev).add(`earn-${String(field)}`));
      toast.info(`Pasted ${rawTokens.length} month values into ${String(field)}`);
    } else if (group === 'DEDUCTION') {
      const field = rowKey as keyof PayBillStoredDeduction;
      setDraftDeductions((prev) => {
        const next = { ...prev };
        rawTokens.forEach((token, offset) => {
          const mIdx = startIdx + offset;
          if (mIdx < MONTH_ORDER.length) {
            const m = MONTH_ORDER[mIdx];
            const num = Number(token.replace(/[^\d.-]/g, ''));
            if (!Number.isNaN(num)) {
              const rec = next[m] || makeEmptyDeduction(m);
              const patch = { ...rec, [field]: num };
              const gross = getMonthGross(m);
              const { total, net } = recalcDeductionTotals(patch, gross);
              next[m] = { ...patch, totalDeductions: total, netPay: net };
            }
          }
        });
        return next;
      });
      setDirtyRows((prev) => new Set(prev).add(`ded-${String(field)}`));
      toast.info(`Pasted ${rawTokens.length} month values into ${String(field)}`);
    }
  };

  const handleCellKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    rowKey: string,
    month: string
  ) => {
    const monthIdx = MONTH_ORDER.indexOf(month);
    if (e.key === 'ArrowRight') {
      if (e.currentTarget.selectionStart === e.currentTarget.value.length) {
        const nextInput = document.querySelector<HTMLInputElement>(
          `input[data-row-key="${rowKey}"][data-month-idx="${monthIdx + 1}"]`
        );
        if (nextInput) {
          e.preventDefault();
          nextInput.focus();
          nextInput.select();
        }
      }
    } else if (e.key === 'ArrowLeft') {
      if (e.currentTarget.selectionStart === 0) {
        const prevInput = document.querySelector<HTMLInputElement>(
          `input[data-row-key="${rowKey}"][data-month-idx="${monthIdx - 1}"]`
        );
        if (prevInput) {
          e.preventDefault();
          prevInput.focus();
          prevInput.select();
        }
      }
    } else if (e.key === 'Enter') {
      const nextInput = document.querySelector<HTMLInputElement>(
        `input[data-row-key="${rowKey}"][data-month-idx="${monthIdx + 1}"]`
      );
      if (nextInput) {
        e.preventDefault();
        nextInput.focus();
        nextInput.select();
      }
    }
  };

  const saveEarningRow = async (field: keyof PayBillStoredEarning) => {
    const rowKey = `earn-${String(field)}`;
    setSavingRow(rowKey);
    try {
      for (const m of visibleMonths) {
        const rec = draftEarnings[m];
        if (!rec) continue;
        const isNew = !earningByMonth[m];
        if (isNew) {
          rec.hrpn = baseEmployeeInfo.hrpn;
          rec.employeeName = baseEmployeeInfo.employeeName;
          rec.designation = baseEmployeeInfo.designation;
          rec.financialYear = baseEmployeeInfo.financialYear;
          rec.importId = rec.importId || manualImportId;
          rec.officeId = officeId;
          await paybillRepository.upsertEarningRecord(rec);
        } else {
          const patch: Partial<PayBillStoredEarning> = {
            [field]: rec[field],
            grossAmount: rec.grossAmount,
          };
          await paybillRepository.updateEarningRecord(rec.id, patch);
        }
        onUpdateEarning(m, { ...rec });
      }
      setDirtyRows((prev) => {
        const next = new Set(prev);
        next.delete(rowKey);
        return next;
      });
      toast.success(`${String(field)} saved`);
    } catch (err) {
      console.error('[PayBillLegacyDataEditor] row save error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to save row');
    } finally {
      setSavingRow(null);
    }
  };

  const saveManualRow = async (label: string) => {
    const rowKey = `manual-${label}`;
    setSavingRow(rowKey);
    try {
      const rowVals = draftManual[label] || {};
      await paybillRepository.saveBulkManualLedgerValues(baseEmployeeInfo.hrpn, label, rowVals);
      onUpdateManualValues(label, rowVals);
      setDirtyRows((prev) => {
        const next = new Set(prev);
        next.delete(rowKey);
        return next;
      });
      toast.success(`${label} saved`);
    } catch (err) {
      console.error('[PayBillLegacyDataEditor] save manual row error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to save row');
    } finally {
      setSavingRow(null);
    }
  };

  const saveDeductionRow = async (field: keyof PayBillStoredDeduction) => {
    const rowKey = `ded-${String(field)}`;
    setSavingRow(rowKey);
    try {
      for (const m of visibleMonths) {
        const rec = draftDeductions[m];
        if (!rec) continue;
        const isNew = !deductionByMonth[m];
        if (isNew) {
          rec.hrpn = baseEmployeeInfo.hrpn;
          rec.employeeName = baseEmployeeInfo.employeeName;
          rec.designation = baseEmployeeInfo.designation;
          rec.financialYear = baseEmployeeInfo.financialYear;
          rec.importId = rec.importId || manualImportId;
          rec.officeId = officeId;
          await paybillRepository.upsertDeductionRecord(rec);
        } else {
          const patch: Partial<PayBillStoredDeduction> = {
            [field]: rec[field],
            totalDeductions: rec.totalDeductions,
            netPay: rec.netPay,
          };
          await paybillRepository.updateDeductionRecord(rec.id, patch);
        }
        onUpdateDeduction(m, { ...rec });
      }
      setDirtyRows((prev) => {
        const next = new Set(prev);
        next.delete(rowKey);
        return next;
      });
      toast.success(`${String(field)} saved`);
    } catch (err) {
      console.error('[PayBillLegacyDataEditor] row save error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to save row');
    } finally {
      setSavingRow(null);
    }
  };

  const handleFillForwardManual = (label: string) => {
    const row = draftManual[label] || {};
    let fillVal = 0;
    for (const m of MONTH_ORDER) {
      if (row[m] && row[m] > 0) {
        fillVal = row[m];
        break;
      }
    }
    const updates: Record<string, number> = {};
    for (const m of MONTH_ORDER) {
      updates[m] = fillVal;
    }
    setDraftManual((prev) => ({ ...prev, [label]: updates }));
    setDirtyRows((prev) => new Set(prev).add(`manual-${label}`));
    toast.info(`Filled ${label} with ${fillVal} for all months`);
  };

  const handleClearRowManual = (label: string) => {
    const updates: Record<string, number> = {};
    for (const m of MONTH_ORDER) {
      updates[m] = 0;
    }
    setDraftManual((prev) => ({ ...prev, [label]: updates }));
    setDirtyRows((prev) => new Set(prev).add(`manual-${label}`));
    toast.info(`Cleared all values for ${label}`);
  };

  const copyFromPreviousMonth = (month: string) => {
    const idx = MONTH_ORDER.indexOf(month);
    if (idx <= 0) return;
    const prevMonth = MONTH_ORDER[idx - 1];
    if (!visibleMonths.includes(prevMonth)) return;

    setDraftEarnings((prev) => {
      const prevRec = prev[prevMonth] || makeEmptyEarning(prevMonth);
      const next = { ...prev };
      for (const col of earningRows) {
        const rec = next[month] || makeEmptyEarning(month);
        const val = (prevRec[col.key as keyof PayBillStoredEarning] as number) ?? 0;
        next[month] = { ...rec, [col.key]: val };
      }
      const finalRec = next[month];
      if (finalRec) {
        next[month] = { ...finalRec, grossAmount: recalcEarningGross(finalRec, month) };
      }
      return next;
    });

    setDraftManual((prev) => {
      const next = { ...prev };
      for (const label of manualAllowances) {
        const p = next[label] || {};
        const val = p[prevMonth] || 0;
        next[label] = { ...p, [month]: val };
      }
      return next;
    });

    setDraftDeductions((prev) => {
      const prevRec = prev[prevMonth] || makeEmptyDeduction(prevMonth);
      const next = { ...prev };
      for (const col of deductionRows) {
        const rec = next[month] || makeEmptyDeduction(month);
        const val = (prevRec[col.key as keyof PayBillStoredDeduction] as number) ?? 0;
        next[month] = { ...rec, [col.key]: val };
      }
      const finalRec = next[month];
      if (finalRec) {
        const gross = getMonthGross(month);
        const { total, net } = recalcDeductionTotals(finalRec, gross);
        next[month] = { ...finalRec, totalDeductions: total, netPay: net };
      }
      return next;
    });

    setDirtyRows((prev) => {
      const next = new Set(prev);
      for (const col of earningRows) next.add(`earn-${col.key}`);
      for (const label of manualAllowances) next.add(`manual-${label}`);
      for (const col of deductionRows) next.add(`ded-${col.key}`);
      return next;
    });

    toast.success(`Copied ${prevMonth} values into ${month}`);
  };

  const visibleMonths = useMemo(() => {
    let months = [...MONTH_ORDER];
    if (monthFilter.length > 0) {
      months = months.filter((m) => monthFilter.includes(m));
    }
    if (search) {
      months = months.filter((m) => m.toLowerCase().includes(search));
    }
    return months;
  }, [monthFilter, search]);

  const earningRows = PAYBILL_EARNING_COLUMNS.filter((c) => c.key !== 'grossAmount');
  const deductionRows = PAYBILL_DEDUCTION_COLUMNS.filter(
    (c) => c.key !== 'totalDeductions' && c.key !== 'netPay'
  );

  const filteredEarningRows = useMemo(() => {
    if (!search) return earningRows;
    return earningRows.filter(
      (c) => c.label.toLowerCase().includes(search) || c.key.toLowerCase().includes(search)
    );
  }, [earningRows, search]);

  const filteredManualRows = useMemo(() => {
    if (!search) return manualAllowances;
    return manualAllowances.filter((l) => l.toLowerCase().includes(search));
  }, [manualAllowances, search]);

  const filteredDeductionRows = useMemo(() => {
    if (!search) return deductionRows;
    return deductionRows.filter(
      (c) => c.label.toLowerCase().includes(search) || c.key.toLowerCase().includes(search)
    );
  }, [deductionRows, search]);

  const hasData =
    Object.keys(earningByMonth).length > 0 ||
    Object.keys(deductionByMonth).length > 0 ||
    Object.keys(manualValues).length > 0 ||
    Boolean(estEmployee) ||
    Boolean(hrpn);

  if (!hasData) {
    return (
      <div className="px-4 py-6 text-center text-xs text-slate-500 dark:text-slate-400">
        Search for an employee HRPN to load uploaded paybill data.
      </div>
    );
  }

  if (
    visibleMonths.length === 0 ||
    (filteredEarningRows.length === 0 && filteredManualRows.length === 0 && filteredDeductionRows.length === 0)
  ) {
    return (
      <div className="px-4 py-6 text-center text-xs text-slate-500 dark:text-slate-400">
        No matching months or parameters. Try clearing the search/filter.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto max-h-[560px] app-scroll">
      <table className="w-full text-sm text-left border-separate border-spacing-0">
        <thead className="bg-slate-100/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 uppercase text-xs tracking-wider sticky top-0 z-30 backdrop-blur-xs">
          <tr>
            <th className="py-2 px-2.5 font-bold border-b border-slate-200 dark:border-slate-700 sticky left-0 bg-slate-100 dark:bg-slate-800 z-20 min-w-[170px] border-r border-slate-200 dark:border-slate-700">
              Parameter
            </th>
            {visibleMonths.map((m) => {
              const idx = MONTH_ORDER.indexOf(m);
              const canCopy = idx > 0 && visibleMonths.includes(MONTH_ORDER[idx - 1]);
              return (
                <th
                  key={m}
                  className="py-2 px-2 font-bold border-b border-slate-200 dark:border-slate-700 text-right min-w-[92px]"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>{m}</span>
                    {canCopy && (
                      <button
                        type="button"
                        title={`Copy ${MONTH_ORDER[idx - 1]} data into ${m}`}
                        onClick={() => copyFromPreviousMonth(m)}
                        className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 transition"
                      >
                        <Copy size={11} />
                      </button>
                    )}
                  </div>
                </th>
              );
            })}
            <th className="py-2 px-2.5 font-bold border-b border-slate-200 dark:border-slate-700 text-right bg-slate-200/60 dark:bg-slate-700/60 min-w-[100px]">
              Total
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {(filteredEarningRows.length > 0 || filteredManualRows.length > 0) && (
            <tr className="bg-blue-100/80 dark:bg-blue-950/50">
              <td colSpan={visibleMonths.length + 2} className="py-1 px-3 font-sans font-bold text-blue-900 dark:text-blue-200">
                EARNING (₹)
              </td>
            </tr>
          )}

          {/* 1. Standard Earning Rows */}
          {filteredEarningRows.map((col) => {
            const rowKey = `earn-${col.key}`;
            const isDirty = dirtyRows.has(rowKey);
            const isSaving = savingRow === rowKey;
            const total = visibleMonths.reduce(
              (s, m) => s + ((draftEarnings[m]?.[col.key as keyof PayBillStoredEarning] as number) || 0),
              0
            );
            return (
              <tr key={col.key} className={`hover:bg-slate-50/40 dark:hover:bg-slate-800/30 ${isDirty ? 'bg-amber-50/30 dark:bg-amber-900/10' : ''}`}>
                <td className="py-1.5 px-2.5 font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 sticky left-0 z-10 border-r border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between gap-2">
                    <span>{col.label}</span>
                    {isDirty && (
                      <PbButton
                        variant="primary"
                        size="sm"
                        icon={Save}
                        onClick={() => saveEarningRow(col.key as keyof PayBillStoredEarning)}
                        disabled={isSaving}
                        className="!py-0.5 !px-1.5 text-[10px]"
                      >
                        {isSaving ? '...' : 'Save'}
                      </PbButton>
                    )}
                  </div>
                </td>
                {visibleMonths.map((m) => {
                  const val = (draftEarnings[m]?.[col.key as keyof PayBillStoredEarning] as number) ?? 0;
                  const monthIdx = MONTH_ORDER.indexOf(m);
                  return (
                    <td key={m} className="py-1 px-1 text-right">
                      <input
                        type="text"
                        inputMode="decimal"
                        data-row-key={col.key}
                        data-month-idx={monthIdx}
                        value={val === 0 ? '' : String(val)}
                        placeholder="0"
                        onChange={(e) => handleEarningDraftChange(m, col.key as keyof PayBillStoredEarning, e.target.value)}
                        onPaste={(e) => handleCellPaste(e, col.key, 'EARNING', m)}
                        onKeyDown={(e) => handleCellKeyDown(e, col.key, m)}
                        className="w-full text-right bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-amber-300 focus:border-amber-500 focus:bg-amber-50/50 dark:focus:bg-amber-950/20 rounded px-1.5 py-1 font-mono text-xs text-slate-800 dark:text-slate-200 outline-none transition"
                      />
                    </td>
                  );
                })}
                <td className="py-1.5 px-2.5 text-right font-mono font-bold text-slate-900 dark:text-slate-100 bg-slate-50/40 dark:bg-slate-800/40">
                  {formatInr(total)}
                </td>
              </tr>
            );
          })}

          {/* 2. Manual Difference Rows (Last section of Earning) */}
          {filteredManualRows.map((label) => {
            const rowKey = `manual-${label}`;
            const isDirty = dirtyRows.has(rowKey);
            const isSaving = savingRow === rowKey;
            const rowVals = draftManual[label] || {};
            const total = visibleMonths.reduce((s, m) => s + (rowVals[m] || 0), 0);
            const isDiff = label.toLowerCase().includes('diff') || label.toLowerCase().includes('arrear');

            return (
              <tr key={rowKey} className={`group hover:bg-slate-50/40 dark:hover:bg-slate-800/30 ${isDirty ? 'bg-amber-50/40 dark:bg-amber-900/20' : ''}`}>
                <td className="py-1.5 px-2.5 font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 sticky left-0 z-10 border-r border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between gap-1.5 min-w-[150px]">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span>{label}</span>
                      {isDiff && (
                        <span className="px-1.5 py-0.2 text-[9px] font-bold uppercase rounded bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60">
                          Arrears
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="inline-flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => handleFillForwardManual(label)}
                          title="Fill forward: replicate first amount across all months"
                          className="p-0.5 rounded hover:bg-blue-100 dark:hover:bg-slate-700 text-slate-400 hover:text-blue-600 transition"
                        >
                          <Sparkles size={11} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleClearRowManual(label)}
                          title="Clear row values"
                          className="p-0.5 rounded hover:bg-rose-100 dark:hover:bg-slate-700 text-slate-400 hover:text-rose-600 transition"
                        >
                          <RotateCcw size={11} />
                        </button>
                      </div>
                      {isDirty && (
                        <PbButton
                          variant="primary"
                          size="sm"
                          icon={Save}
                          onClick={() => saveManualRow(label)}
                          disabled={isSaving}
                          className="!py-0.5 !px-1.5 text-[10px]"
                        >
                          {isSaving ? '...' : 'Save'}
                        </PbButton>
                      )}
                    </div>
                  </div>
                </td>
                {visibleMonths.map((m) => {
                  const val = rowVals[m] || 0;
                  const monthIdx = MONTH_ORDER.indexOf(m);
                  return (
                    <td key={m} className="py-1 px-1 text-right">
                      <input
                        type="text"
                        inputMode="decimal"
                        data-row-key={label}
                        data-month-idx={monthIdx}
                        value={val === 0 ? '' : String(val)}
                        placeholder="0"
                        onChange={(e) => handleManualDraftChange(m, label, e.target.value)}
                        onPaste={(e) => handleCellPaste(e, label, 'MANUAL', m)}
                        onKeyDown={(e) => handleCellKeyDown(e, label, m)}
                        title={`Enter or paste Excel numbers for ${m}`}
                        className={`w-full text-right rounded px-1.5 py-1 font-mono text-xs outline-none transition ${
                          val > 0
                            ? 'font-bold text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/40'
                            : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-amber-300 focus:border-amber-500 focus:bg-amber-50/50 dark:focus:bg-amber-950/20 text-slate-800 dark:text-slate-200'
                        }`}
                      />
                    </td>
                  );
                })}
                <td className="py-1.5 px-2.5 text-right font-mono font-bold text-amber-900 dark:text-amber-200 bg-amber-50/40 dark:bg-amber-950/20">
                  {formatInr(total)}
                </td>
              </tr>
            );
          })}

          {/* 3. Gross Amount Row */}
          {(filteredEarningRows.length > 0 || filteredManualRows.length > 0) && (
            <tr className="bg-blue-50/80 dark:bg-blue-950/40 font-bold">
              <td className="py-1.5 px-2.5 text-slate-800 dark:text-slate-200 sticky left-0 bg-blue-50 dark:bg-blue-950/40 z-10 border-r border-slate-100 dark:border-slate-800">
                Gross Amount
              </td>
              {visibleMonths.map((m) => (
                <td key={m} className="py-1.5 px-1.5 text-right font-mono text-blue-700 dark:text-blue-300">
                  {formatInr(getMonthGross(m))}
                </td>
              ))}
              <td className="py-1.5 px-2.5 text-right font-mono font-extrabold text-blue-800 dark:text-blue-200 bg-blue-100/40 dark:bg-blue-900/30">
                {formatInr(visibleMonths.reduce((s, m) => s + getMonthGross(m), 0))}
              </td>
            </tr>
          )}

          {/* DEDUCTION SECTION */}
          {filteredDeductionRows.length > 0 && (
            <tr className="bg-rose-100/80 dark:bg-rose-950/40">
              <td colSpan={visibleMonths.length + 2} className="py-1 px-3 font-sans font-bold text-rose-900 dark:text-rose-200">
                DEDUCTION (₹)
              </td>
            </tr>
          )}
          {filteredDeductionRows.map((col) => {
            const rowKey = `ded-${col.key}`;
            const isDirty = dirtyRows.has(rowKey);
            const isSaving = savingRow === rowKey;
            const total = visibleMonths.reduce(
              (s, m) => s + ((draftDeductions[m]?.[col.key as keyof PayBillStoredDeduction] as number) || 0),
              0
            );
            return (
              <tr key={col.key} className={`hover:bg-slate-50/40 dark:hover:bg-slate-800/30 ${isDirty ? 'bg-amber-50/30 dark:bg-amber-900/10' : ''}`}>
                <td className="py-1.5 px-2.5 font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 sticky left-0 z-10 border-r border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between gap-2">
                    <span>{col.label}</span>
                    {isDirty && (
                      <PbButton
                        variant="primary"
                        size="sm"
                        icon={Save}
                        onClick={() => saveDeductionRow(col.key as keyof PayBillStoredDeduction)}
                        disabled={isSaving}
                        className="!py-0.5 !px-1.5 text-[10px]"
                      >
                        {isSaving ? '...' : 'Save'}
                      </PbButton>
                    )}
                  </div>
                </td>
                {visibleMonths.map((m) => {
                  const val = (draftDeductions[m]?.[col.key as keyof PayBillStoredDeduction] as number) ?? 0;
                  const monthIdx = MONTH_ORDER.indexOf(m);
                  return (
                    <td key={m} className="py-1 px-1 text-right">
                      <input
                        type="text"
                        inputMode="decimal"
                        data-row-key={col.key}
                        data-month-idx={monthIdx}
                        value={val === 0 ? '' : String(val)}
                        placeholder="0"
                        onChange={(e) => handleDeductionDraftChange(m, col.key as keyof PayBillStoredDeduction, e.target.value)}
                        onPaste={(e) => handleCellPaste(e, col.key, 'DEDUCTION', m)}
                        onKeyDown={(e) => handleCellKeyDown(e, col.key, m)}
                        className="w-full text-right bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-amber-300 focus:border-amber-500 focus:bg-amber-50/50 dark:focus:bg-amber-950/20 rounded px-1.5 py-1 font-mono text-xs text-slate-800 dark:text-slate-200 outline-none transition"
                      />
                    </td>
                  );
                })}
                <td className="py-1.5 px-2.5 text-right font-mono font-bold text-slate-900 dark:text-slate-100 bg-slate-50/40 dark:bg-slate-800/40">
                  {formatInr(total)}
                </td>
              </tr>
            );
          })}
          {filteredDeductionRows.length > 0 && (
            <>
              <tr className="bg-rose-50/80 dark:bg-rose-950/40 font-bold">
                <td className="py-1.5 px-2.5 text-slate-800 dark:text-slate-200 sticky left-0 bg-rose-50 dark:bg-rose-950/40 z-10 border-r border-slate-100 dark:border-slate-800">
                  Total Deductions
                </td>
                {visibleMonths.map((m) => (
                  <td key={m} className="py-1.5 px-1.5 text-right font-mono text-rose-700 dark:text-rose-300">
                    {formatInr(draftDeductions[m]?.totalDeductions || 0)}
                  </td>
                ))}
                <td className="py-1.5 px-2.5 text-right font-mono font-extrabold text-rose-800 dark:text-rose-200 bg-rose-100/40 dark:bg-rose-900/30">
                  {formatInr(visibleMonths.reduce((s, m) => s + (draftDeductions[m]?.totalDeductions || 0), 0))}
                </td>
              </tr>
              <tr className="bg-emerald-50/50 dark:bg-emerald-950/20 font-bold">
                <td className="py-1.5 px-2.5 text-emerald-800 dark:text-emerald-300 sticky left-0 bg-emerald-50 dark:bg-emerald-950/20 z-10 border-r border-emerald-100 dark:border-emerald-900/30">
                  Net Pay
                </td>
                {visibleMonths.map((m) => {
                  const gross = getMonthGross(m);
                  const ded = draftDeductions[m]?.totalDeductions || 0;
                  const net = gross - ded;
                  return (
                    <td key={m} className="py-1.5 px-1.5 text-right font-mono text-emerald-700 dark:text-emerald-300">
                      {formatInr(net)}
                    </td>
                  );
                })}
                <td className="py-1.5 px-2.5 text-right font-mono font-extrabold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300">
                  {formatInr(
                    visibleMonths.reduce((s, m) => {
                      const gross = getMonthGross(m);
                      const ded = draftDeductions[m]?.totalDeductions || 0;
                      return s + (gross - ded);
                    }, 0)
                  )}
                </td>
              </tr>
            </>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function PayBillLegacyDataEditor() {
  const [searchParams] = useSearchParams();
  const initialHrpn = searchParams.get('hrpn') || '';
  const fy = useUIStore((s) => s.activeFinancialYear);
  const fyLabel = `${fy}-${String(fy + 1).slice(-2)}`;
  const [search, setSearch] = useState('');
  const [monthFilter, setMonthFilter] = useState<string[]>([]);
  const [hrpn, setHrpn] = useState(initialHrpn);
  const [earningByMonth, setEarningByMonth] = useState<Record<string, PayBillStoredEarning>>({});
  const [deductionByMonth, setDeductionByMonth] = useState<Record<string, PayBillStoredDeduction>>({});
  const [manualAllowances, setManualAllowances] = useState<string[]>(['Pay Difference', 'DA Difference']);
  const [manualValues, setManualValues] = useState<Record<string, Record<string, number>>>({});
  const [manualImportId, setManualImportId] = useState<string>('');
  const [estEmployee, setEstEmployee] = useState<EstablishmentEmployee | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSearchEmployee = useCallback(async (searchTarget?: string) => {
    const clean = (searchTarget !== undefined ? searchTarget : hrpn).trim();
    if (!clean) {
      toast.error('Enter an HRPN to search');
      return;
    }
    setLoading(true);
    try {
      let employees: EstablishmentEmployee[] = [];
      try {
        employees = await establishmentService.syncEmployees();
        if (employees.length === 0) employees = establishmentService.loadEmployees();
      } catch (err) {
        console.warn('[PayBillLegacyDataEditor] establishment sync failed, using local cache:', err);
        employees = establishmentService.loadEmployees();
      }
      const match = findEstablishmentEmployee(employees, clean, fy);

      const [earnings, deductions, manualId, settings, manualValMap] = await Promise.all([
        paybillRepository.listEarnings({ financialYear: fy, hrpn: clean }),
        paybillRepository.listDeductions({ financialYear: fy, hrpn: clean }),
        paybillRepository.getOrCreateManualImport(fy),
        paybillRepository.getSettings(),
        paybillRepository.getManualLedgerValues(),
      ]);
      const emap: Record<string, PayBillStoredEarning> = {};
      for (const e of earnings) {
        if (!emap[e.month]) emap[e.month] = e;
      }
      const dmap: Record<string, PayBillStoredDeduction> = {};
      for (const d of deductions) {
        if (!dmap[d.month]) dmap[d.month] = d;
      }
      const allowList =
        settings.manualAllowances && settings.manualAllowances.length > 0
          ? settings.manualAllowances
          : ['Pay Difference', 'DA Difference'];

      setEarningByMonth(emap);
      setDeductionByMonth(dmap);
      setManualAllowances(allowList);
      setManualValues(manualValMap[clean] || {});
      setManualImportId(manualId);
      setEstEmployee(match);

      if (match) {
        toast.success(`${match.name}${match.designation ? ` · ${match.designation}` : ''} (Establishment register)`);
      } else {
        toast.info('No employee found in Establishment register for this HRPN / FY');
      }
      if (earnings.length === 0 && deductions.length === 0 && match) {
        toast.info('No uploaded paybill data — enter values directly for any month');
      } else if (earnings.length === 0 && deductions.length === 0) {
        toast.info('No paybill data found for this HRPN / FY');
      }
    } catch (err) {
      console.error('[PayBillLegacyDataEditor] search error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to load employee data');
    } finally {
      setLoading(false);
    }
  }, [hrpn, fy]);

  useEffect(() => {
    if (initialHrpn) {
      setHrpn(initialHrpn);
      handleSearchEmployee(initialHrpn);
    }
  }, [initialHrpn, handleSearchEmployee]);

  const handleUpdateEarning = (month: string, updated: PayBillStoredEarning) => {
    setEarningByMonth((prev) => ({ ...prev, [month]: updated }));
  };

  const handleUpdateDeduction = (month: string, updated: PayBillStoredDeduction) => {
    setDeductionByMonth((prev) => ({ ...prev, [month]: updated }));
  };

  const handleUpdateManualValues = (label: string, updates: Record<string, number>) => {
    setManualValues((prev) => ({ ...prev, [label]: { ...(prev[label] || {}), ...updates } }));
  };

  return (
    <div className="max-w-7xl mx-auto space-y-3">
      <WorkspaceHeader
        eyebrow="Employee IT · Government Pay Bill Register"
        title="Legacy Paybill Data Editor"
        context={
          <>
            <Calendar size={13} className="text-slate-500" /> FY {fyLabel}
            {estEmployee && (
              <span className="text-slate-500 dark:text-slate-400">
                {' '}· <span className="font-semibold text-slate-700 dark:text-slate-200">{estEmployee.name}</span>
                {estEmployee.designation ? ` · ${estEmployee.designation}` : ''}
              </span>
            )}
          </>
        }
        actions={
          <PbButton
            variant="primary"
            icon={Search}
            onClick={() => handleSearchEmployee()}
            disabled={loading || !hrpn.trim()}
          >
            {loading ? 'Loading...' : 'Search Employee'}
          </PbButton>
        }
      />

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={hrpn}
              onChange={(e) => setHrpn(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearchEmployee()}
              placeholder="Enter HRPN like 123456"
              className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 outline-none text-slate-700 dark:text-slate-200"
            />
          </div>
          <div className="relative min-w-[180px]">
            <select
              value={monthFilter.length === 0 ? '' : monthFilter[0]}
              onChange={(e) => setMonthFilter(e.target.value ? [e.target.value] : [])}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:border-amber-500 outline-none text-slate-700 dark:text-slate-200"
            >
              <option value="">All months</option>
              {MONTH_ORDER.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div className="relative min-w-[220px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter parameter or month"
              className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 outline-none text-slate-700 dark:text-slate-200"
            />
          </div>
          {(search || monthFilter.length > 0) && (
            <PbButton variant="ghost" size="sm" onClick={() => { setSearch(''); setMonthFilter([]); }}>
              Clear
            </PbButton>
          )}
        </div>

        <PbPanel padded={false} bodyClassName="flex flex-col">
          <div className="px-3.5 py-2.5 bg-gradient-to-r from-amber-50/80 to-orange-50/40 dark:from-amber-950/30 dark:to-orange-950/20 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
                <Database size={13} />
              </span>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                  Legacy Paybill Data & Arrears Editor
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  Edit salary allowances, pay/DA difference arrears, and deductions. Paste directly from Excel (`Ctrl+V`).
                </p>
              </div>
            </div>
            <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
              <Save size={11} /> Click Save per row to persist changes
            </span>
          </div>

          <LegacyDataTable
            earningByMonth={earningByMonth}
            deductionByMonth={deductionByMonth}
            manualAllowances={manualAllowances}
            manualValues={manualValues}
            search={search.toLowerCase().trim()}
            monthFilter={monthFilter}
            manualImportId={manualImportId}
            hrpn={hrpn.trim()}
            financialYear={fy}
            estEmployee={estEmployee}
            onUpdateEarning={handleUpdateEarning}
            onUpdateDeduction={handleUpdateDeduction}
            onUpdateManualValues={handleUpdateManualValues}
          />

          <div className="px-3 py-2 bg-slate-50/60 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <Database size={11} /> Standard rows write to paybill records; difference arrears write to manual ledger store.
            </span>
            <span className="hidden sm:inline">
              FY {fyLabel} • {estEmployee ? `${estEmployee.name} · HRPN ${estEmployee.hrpnNo || hrpn || '—'}` : `HRPN ${hrpn || '—'}`}
            </span>
          </div>
        </PbPanel>
      </div>
    </div>
  );
}
