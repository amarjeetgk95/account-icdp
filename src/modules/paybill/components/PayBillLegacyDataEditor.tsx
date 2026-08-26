import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { paybillRepository } from '../repositories/paybill.repository';
import { PAYBILL_EARNING_COLUMNS, PAYBILL_DEDUCTION_COLUMNS } from '../services/paybillReport.service';
import { establishmentService } from '@/modules/establishment/services/establishment.service';
import type { EstablishmentEmployee } from '@/modules/establishment/types';
import { latestPayOf } from '@/modules/establishment/types';
import {
  Search,
  Save,
  Copy,
  Sparkles,
  RotateCcw,
  Check,
  X,
  Calendar,
} from 'lucide-react';
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

const MONTH_SHORT = ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb'];

function findEstablishmentEmployee(
  employees: EstablishmentEmployee[],
  hrpn: string,
  _fy?: number
): EstablishmentEmployee | null {
  const clean = hrpn.trim().toLowerCase();
  if (!clean) return null;
  const match = employees.find(
    (e) => (e.hrpnNo || '').trim().toLowerCase() === clean
  );
  return match ?? null;
}

const formatInr = (n: number | undefined, allowZeroDash = false) => {
  if (allowZeroDash && (!n || n === 0)) return '—';
  return `₹${Math.round(n || 0).toLocaleString('en-IN')}`;
};

export function PayBillLegacyDataEditor() {
  const [searchParams] = useSearchParams();
  const initialHrpn = (searchParams.get('hrpn') || '').trim();
  const urlFy = parseInt(searchParams.get('fy') || '', 10);
  const activeFy = useUIStore((s) => s.activeFinancialYear);
  const fy = !Number.isNaN(urlFy) && urlFy > 2000 ? urlFy : activeFy;
  const fyLabel = `${fy}-${String(fy + 1).slice(-2)}`;

  const [search, setSearch] = useState('');
  const [monthFilter, setMonthFilter] = useState<string[]>([]);
  const [hrpn, setHrpn] = useState(initialHrpn);
  const [earningByMonth, setEarningByMonth] = useState<Record<string, PayBillStoredEarning>>({});
  const [deductionByMonth, setDeductionByMonth] = useState<Record<string, PayBillStoredDeduction>>({});
  const [manualAllowances, setManualAllowances] = useState<string[]>(['Pay Difference', 'DA Difference']);
  const [manualValues, setManualValues] = useState<Record<string, Record<string, number>>>({});
  const [manualImportId, setManualImportId] = useState<string>('');
  const [manualImportMap, setManualImportMap] = useState<Record<string, string>>({});
  const [estEmployee, setEstEmployee] = useState<EstablishmentEmployee | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Draft state for batch editing
  const [draftEarnings, setDraftEarnings] = useState<Record<string, PayBillStoredEarning>>({});
  const [draftDeductions, setDraftDeductions] = useState<Record<string, PayBillStoredDeduction>>({});
  const [draftManual, setDraftManual] = useState<Record<string, Record<string, number>>>({});
  const [dirtyRows, setDirtyRows] = useState<Set<string>>(new Set());

  const officeId = getOfficeId() || '';
  const tableContainerRef = useRef<HTMLDivElement>(null);

  const employeeName =
    estEmployee?.name ||
    earningByMonth[MONTH_ORDER.find((m) => earningByMonth[m]) || '']?.employeeName ||
    deductionByMonth[MONTH_ORDER.find((m) => deductionByMonth[m]) || '']?.employeeName ||
    '';
  const designation =
    estEmployee?.designation ||
    earningByMonth[MONTH_ORDER.find((m) => earningByMonth[m]) || '']?.designation ||
    deductionByMonth[MONTH_ORDER.find((m) => deductionByMonth[m]) || '']?.designation ||
    null;

  const baseEmployeeInfo = useMemo(() => {
    const base =
      earningByMonth[MONTH_ORDER.find((m) => earningByMonth[m]) || ''] ||
      deductionByMonth[MONTH_ORDER.find((m) => deductionByMonth[m]) || ''];
    const latestPay = estEmployee ? latestPayOf(estEmployee) : undefined;
    const cleanHrpn = (estEmployee?.hrpnNo || base?.hrpn || hrpn || '').trim();
    const cleanName = (estEmployee?.name || base?.employeeName || employeeName || 'Employee').trim();
    return {
      hrpn: cleanHrpn,
      employeeName: cleanName,
      designation: estEmployee?.designation || base?.designation || designation,
      payScale: latestPay?.payScale || estEmployee?.payScale || null,
      employeeId: estEmployee?.id ?? null,
      financialYear: base?.financialYear || fy,
    };
  }, [earningByMonth, deductionByMonth, hrpn, employeeName, designation, fy, estEmployee]);

  const loadEmployeeData = useCallback(async (targetHrpn: string) => {
    const clean = targetHrpn.trim();
    if (!clean) return;

    setLoading(true);
    try {
      let employees: EstablishmentEmployee[] = [];
      try {
        employees = await establishmentService.syncEmployees();
        if (employees.length === 0) employees = establishmentService.loadEmployees();
      } catch (err) {
        console.warn('[PayBillLegacyDataEditor] establishment sync fallback:', err);
        employees = establishmentService.loadEmployees();
      }
      const match = findEstablishmentEmployee(employees, clean, fy);

      const [earnings, deductions, importMap, settings, manualValMap] = await Promise.all([
        paybillRepository.listEarnings({ financialYear: fy, hrpn: clean }),
        paybillRepository.listDeductions({ financialYear: fy, hrpn: clean }),
        paybillRepository.getOrCreateAllManualImports(fy),
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

      const manualMap = manualValMap[clean] || {};
      const fallbackId = importMap['March'] || Object.values(importMap)[0] || '';

      setEarningByMonth(emap);
      setDeductionByMonth(dmap);
      setManualAllowances(allowList);
      setManualValues(manualMap);
      setManualImportMap(importMap);
      setManualImportId(fallbackId);
      setEstEmployee(match);

      setDraftEarnings(emap);
      setDraftDeductions(dmap);
      setDraftManual(manualMap);
      setDirtyRows(new Set());
    } catch (err) {
      console.error('[PayBillLegacyDataEditor] search error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to load employee data');
    } finally {
      setLoading(false);
    }
  }, [fy]);

  useEffect(() => {
    if (initialHrpn) {
      setHrpn(initialHrpn);
      loadEmployeeData(initialHrpn);
    }
  }, [initialHrpn, loadEmployeeData]);

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
    importId: manualImportMap[month] || manualImportId,
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
      importId: manualImportMap[month] || manualImportId,
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
    let newGross = 0;
    setDraftEarnings((prev) => {
      const rec = prev[month] || makeEmptyEarning(month);
      const patch: Partial<PayBillStoredEarning> = { [field]: safe };
      newGross = recalcEarningGross({ ...rec, ...patch }, month);
      const updated: PayBillStoredEarning = {
        ...rec,
        ...patch,
        grossAmount: newGross,
      };
      return { ...prev, [month]: updated };
    });
    setDraftDeductions((prev) => {
      const rec = prev[month] || makeEmptyDeduction(month);
      const { total, net } = recalcDeductionTotals(rec, newGross);
      return { ...prev, [month]: { ...rec, totalDeductions: total, netPay: net } };
    });
    setDirtyRows((prev) => new Set(prev).add(`earn-${String(field)}`));
  };

  const handleManualDraftChange = (month: string, label: string, raw: string) => {
    const num = raw === '' ? 0 : Number(raw);
    const safe = Number.isFinite(num) ? num : 0;
    const nextManual = {
      ...draftManual,
      [label]: { ...(draftManual[label] || {}), [month]: safe },
    };
    setDraftManual(nextManual);
    const earnRec = draftEarnings[month] || makeEmptyEarning(month);
    const newGross = recalcEarningGross(earnRec, month, nextManual);
    setDraftEarnings((prev) => ({
      ...prev,
      [month]: { ...earnRec, grossAmount: newGross },
    }));
    setDraftDeductions((prev) => {
      const rec = prev[month] || makeEmptyDeduction(month);
      const { total, net } = recalcDeductionTotals(rec, newGross);
      return { ...prev, [month]: { ...rec, totalDeductions: total, netPay: net } };
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

  const clearMonthData = (month: string) => {
    // 1. Clear earnings for this month
    setDraftEarnings((prev) => {
      const next = { ...prev };
      const empty = makeEmptyEarning(month);
      next[month] = empty;
      return next;
    });

    // 2. Clear manual differences for this month
    setDraftManual((prev) => {
      const next = { ...prev };
      for (const label of manualAllowances) {
        if (next[label]) {
          next[label] = { ...next[label], [month]: 0 };
        }
      }
      return next;
    });

    // 3. Clear deductions for this month
    setDraftDeductions((prev) => {
      const next = { ...prev };
      const empty = makeEmptyDeduction(month);
      empty.netPay = 0;
      empty.totalDeductions = 0;
      next[month] = empty;
      return next;
    });

    // 4. Mark all relevant rows dirty so Save persists the zeroes
    setDirtyRows((prev) => {
      const next = new Set(prev);
      for (const col of earningRows) next.add(`earn-${col.key}`);
      for (const label of manualAllowances) next.add(`manual-${label}`);
      for (const col of deductionRows) next.add(`ded-${col.key}`);
      return next;
    });

    toast.info(`Cleared all values for ${month}`);
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

  const earningRows = useMemo(
    () => PAYBILL_EARNING_COLUMNS.filter((c) => c.key !== 'grossAmount'),
    []
  );
  const deductionRows = useMemo(
    () => PAYBILL_DEDUCTION_COLUMNS.filter((c) => c.key !== 'totalDeductions' && c.key !== 'netPay'),
    []
  );

  const filteredEarningRows = useMemo(() => {
    if (!search) return earningRows;
    const s = search.toLowerCase();
    return earningRows.filter(
      (c) => c.label.toLowerCase().includes(s) || c.key.toLowerCase().includes(s)
    );
  }, [earningRows, search]);

  const filteredManualRows = useMemo(() => {
    if (!search) return manualAllowances;
    const s = search.toLowerCase();
    return manualAllowances.filter((l) => l.toLowerCase().includes(s));
  }, [manualAllowances, search]);

  const filteredDeductionRows = useMemo(() => {
    if (!search) return deductionRows;
    const s = search.toLowerCase();
    return deductionRows.filter(
      (c) => c.label.toLowerCase().includes(s) || c.key.toLowerCase().includes(s)
    );
  }, [deductionRows, search]);

  const allEditableRowKeys = useMemo(() => {
    const earnKeys = filteredEarningRows.map((r) => r.key);
    const manualKeys = filteredManualRows;
    const dedKeys = filteredDeductionRows.map((r) => r.key);
    return [...earnKeys, ...manualKeys, ...dedKeys];
  }, [filteredEarningRows, filteredManualRows, filteredDeductionRows]);

  const handleCellKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    rowKey: string,
    month: string
  ) => {
    const monthIdx = MONTH_ORDER.indexOf(month);
    const currentRowIdx = allEditableRowKeys.indexOf(rowKey);
    if (currentRowIdx < 0 || monthIdx < 0) return;

    const focusCell = (targetRowIdx: number, targetMonthIdx: number) => {
      if (targetRowIdx < 0 || targetRowIdx >= allEditableRowKeys.length) return false;
      if (targetMonthIdx < 0 || targetMonthIdx >= MONTH_ORDER.length) return false;
      const targetRowKey = allEditableRowKeys[targetRowIdx];
      const el = document.querySelector<HTMLInputElement>(
        `input[data-row-key="${targetRowKey}"][data-month-idx="${targetMonthIdx}"]`
      );
      if (el) {
        el.focus();
        el.select();
        return true;
      }
      return false;
    };

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      focusCell(currentRowIdx - 1, monthIdx);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      focusCell(currentRowIdx + 1, monthIdx);
    } else if (e.key === 'ArrowRight') {
      const isAtEnd =
        e.currentTarget.selectionStart === e.currentTarget.value.length &&
        e.currentTarget.selectionEnd === e.currentTarget.value.length;
      const isAllSelected =
        e.currentTarget.selectionStart === 0 &&
        e.currentTarget.selectionEnd === e.currentTarget.value.length;
      if (isAtEnd || isAllSelected) {
        e.preventDefault();
        if (monthIdx + 1 < MONTH_ORDER.length) {
          focusCell(currentRowIdx, monthIdx + 1);
        } else if (currentRowIdx + 1 < allEditableRowKeys.length) {
          focusCell(currentRowIdx + 1, 0);
        }
      }
    } else if (e.key === 'ArrowLeft') {
      const isAtStart =
        e.currentTarget.selectionStart === 0 && e.currentTarget.selectionEnd === 0;
      const isAllSelected =
        e.currentTarget.selectionStart === 0 &&
        e.currentTarget.selectionEnd === e.currentTarget.value.length;
      if (isAtStart || isAllSelected) {
        e.preventDefault();
        if (monthIdx - 1 >= 0) {
          focusCell(currentRowIdx, monthIdx - 1);
        } else if (currentRowIdx - 1 >= 0) {
          focusCell(currentRowIdx - 1, MONTH_ORDER.length - 1);
        }
      }
    } else if (e.key === 'Tab') {
      if (e.shiftKey) {
        if (monthIdx === 0 && currentRowIdx > 0) {
          e.preventDefault();
          focusCell(currentRowIdx - 1, MONTH_ORDER.length - 1);
        }
      } else {
        if (monthIdx === MONTH_ORDER.length - 1 && currentRowIdx < allEditableRowKeys.length - 1) {
          e.preventDefault();
          focusCell(currentRowIdx + 1, 0);
        }
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (currentRowIdx + 1 < allEditableRowKeys.length) {
        focusCell(currentRowIdx + 1, monthIdx);
      } else if (monthIdx + 1 < MONTH_ORDER.length) {
        focusCell(0, monthIdx + 1);
      }
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
    toast.info(`Filled ${label} with ${fillVal} across all months`);
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

    const prevEarning = draftEarnings[prevMonth] || makeEmptyEarning(prevMonth);
    const prevDeduction = draftDeductions[prevMonth] || makeEmptyDeduction(prevMonth);

    // 1. Updated Manual
    const nextManual = { ...draftManual };
    for (const label of manualAllowances) {
      const p = nextManual[label] || {};
      const val = p[prevMonth] || 0;
      nextManual[label] = { ...p, [month]: val };
    }

    // 2. Updated Earnings
    const currentEarn = draftEarnings[month] || makeEmptyEarning(month);
    const patchedEarn: PayBillStoredEarning = { ...currentEarn };
    for (const col of earningRows) {
      const val = (prevEarning[col.key as keyof PayBillStoredEarning] as number) ?? 0;
      (patchedEarn as unknown as Record<string, unknown>)[col.key] = val;
    }
    patchedEarn.grossAmount = recalcEarningGross(patchedEarn, month, nextManual);
    const nextEarnings = { ...draftEarnings, [month]: patchedEarn };

    // 3. Updated Deductions
    const currentDed = draftDeductions[month] || makeEmptyDeduction(month);
    const patchedDed: PayBillStoredDeduction = { ...currentDed };
    for (const col of deductionRows) {
      const val = (prevDeduction[col.key as keyof PayBillStoredDeduction] as number) ?? 0;
      (patchedDed as unknown as Record<string, unknown>)[col.key] = val;
    }
    const { total, net } = recalcDeductionTotals(patchedDed, patchedEarn.grossAmount);
    patchedDed.totalDeductions = total;
    patchedDed.netPay = net;
    const nextDeductions = { ...draftDeductions, [month]: patchedDed };

    setDraftEarnings(nextEarnings);
    setDraftManual(nextManual);
    setDraftDeductions(nextDeductions);

    setDirtyRows((prev) => {
      const next = new Set(prev);
      for (const col of earningRows) next.add(`earn-${col.key}`);
      for (const label of manualAllowances) next.add(`manual-${label}`);
      for (const col of deductionRows) next.add(`ded-${col.key}`);
      return next;
    });

    toast.success(`Copied ${prevMonth} values into ${month}`);
  };

  /** BATCH SAVE ALL DIRTY ROWS IN PARALLEL */
  const handleSaveAll = async (): Promise<boolean> => {
    if (dirtyRows.size === 0) {
      toast.info('No changes to save');
      return true;
    }
    setSaving(true);
    try {
      const hasDirtyEarnings = earningRows.some((col) => dirtyRows.has(`earn-${col.key}`));
      const hasDirtyDeductions = deductionRows.some((col) => dirtyRows.has(`ded-${col.key}`));

      const savePromises: Promise<unknown>[] = [];

      // Ensure we have a valid import ID mapping for all months
      let currentMap = manualImportMap;
      if (Object.keys(currentMap).length < MONTH_ORDER.length) {
        currentMap = await paybillRepository.getOrCreateAllManualImports(baseEmployeeInfo.financialYear || fy);
        setManualImportMap(currentMap);
      }

      // 1. Bulk Upsert Earnings (only non-empty or modified months)
      if (hasDirtyEarnings) {
        const earningRecordsToSave: PayBillStoredEarning[] = MONTH_ORDER
          .filter((m) => {
            const rec = draftEarnings[m];
            const hasData = rec && (rec.grossAmount > 0 || (rec.basicPay || 0) > 0);
            return hasData || Boolean(earningByMonth[m]);
          })
          .map((m) => {
            const rec = draftEarnings[m] || makeEmptyEarning(m);
            return {
              ...rec,
              hrpn: baseEmployeeInfo.hrpn,
              employeeName: baseEmployeeInfo.employeeName,
              designation: baseEmployeeInfo.designation,
              financialYear: baseEmployeeInfo.financialYear,
              importId: earningByMonth[m]?.importId || rec.importId || currentMap[m] || manualImportId,
              officeId,
              grossAmount: recalcEarningGross(rec, m, draftManual),
            };
          });
        if (earningRecordsToSave.length > 0) {
          savePromises.push(paybillRepository.upsertEarningRecordsBatch(earningRecordsToSave));
        }
      }

      // 2. Bulk Upsert Deductions (only non-empty or modified months)
      if (hasDirtyDeductions) {
        const deductionRecordsToSave: PayBillStoredDeduction[] = MONTH_ORDER
          .filter((m) => {
            const rec = draftDeductions[m];
            const hasData = rec && (rec.totalDeductions > 0 || (rec.incomeTax || 0) > 0 || (rec.profTax || 0) > 0);
            return hasData || Boolean(deductionByMonth[m]);
          })
          .map((m) => {
            const rec = draftDeductions[m] || makeEmptyDeduction(m);
            const gross = getMonthGross(m, draftEarnings, draftManual);
            const { total, net } = recalcDeductionTotals(rec, gross);
            return {
              ...rec,
              hrpn: baseEmployeeInfo.hrpn,
              employeeName: baseEmployeeInfo.employeeName,
              designation: baseEmployeeInfo.designation,
              financialYear: baseEmployeeInfo.financialYear,
              importId: deductionByMonth[m]?.importId || rec.importId || currentMap[m] || manualImportId,
              officeId,
              totalDeductions: total,
              netPay: net,
            };
          });
        if (deductionRecordsToSave.length > 0) {
          savePromises.push(paybillRepository.upsertDeductionRecordsBatch(deductionRecordsToSave));
        }
      }

      // 3. Save Manual Difference Rows in a single call (only if there are actual non-zero values)
      const dirtyManualLabels = manualAllowances.filter((label) => dirtyRows.has(`manual-${label}`));
      if (dirtyManualLabels.length > 0) {
        for (const label of dirtyManualLabels) {
          const rowVals = draftManual[label] || {};
          const hasNonZero = Object.values(rowVals).some((v) => v > 0);
          const hadPrevious = manualValues[label] && Object.values(manualValues[label]).some((v) => v > 0);
          if (hasNonZero || hadPrevious) {
            savePromises.push(
              paybillRepository.saveBulkManualLedgerValues(baseEmployeeInfo.hrpn, label, rowVals)
            );
          }
        }
      }

      // Execute everything concurrently in a single round trip!
      await Promise.all(savePromises);

      setEarningByMonth(draftEarnings);
      setDeductionByMonth(draftDeductions);
      setManualValues(draftManual);
      setDirtyRows(new Set());

      // Notify parent/opener window to trigger instant ledger refresh
      if (typeof window !== 'undefined' && window.opener) {
        try {
          window.opener.postMessage({ type: 'PAYBILL_LEGACY_SAVED', hrpn: baseEmployeeInfo.hrpn }, '*');
        } catch {
          // Cross-origin fallback
        }
      }

      toast.success('All changes saved successfully');
      return true;
    } catch (err) {
      console.error('[PayBillLegacyDataEditor] save all error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to save changes');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (dirtyRows.size > 0) {
      const confirmClose = window.confirm(
        'You have unsaved changes in this legacy editor. Are you sure you want to close without saving?'
      );
      if (!confirmClose) return;
    }
    window.close();
  };

  const handleSaveAndClose = async () => {
    const success = await handleSaveAll();
    if (success) {
      setTimeout(() => {
        window.close();
      }, 250);
    }
  };

  const handleDiscard = () => {
    if (window.confirm('Discard all unsaved edits and reset to server state?')) {
      setDraftEarnings(earningByMonth);
      setDraftDeductions(deductionByMonth);
      setDraftManual(manualValues);
      setDirtyRows(new Set());
      toast.info('Unsaved changes discarded');
    }
  };

  // Keyboard shortcut Ctrl+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void handleSaveAll();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const visibleMonths = useMemo(() => {
    let months = [...MONTH_ORDER];
    if (monthFilter.length > 0) {
      months = months.filter((m) => monthFilter.includes(m));
    }
    if (search) {
      months = months.filter((m) => m.toLowerCase().includes(search.toLowerCase()));
    }
    return months;
  }, [monthFilter, search]);

  const totalGross = visibleMonths.reduce((s, m) => s + getMonthGross(m), 0);
  const totalDeductions = visibleMonths.reduce(
    (s, m) => s + (draftDeductions[m]?.totalDeductions || 0),
    0
  );
  const totalNet = totalGross - totalDeductions;

  return (
    <div className="h-screen w-full max-w-full flex flex-col bg-slate-100 dark:bg-slate-950 p-4 sm:px-8 sm:py-5 lg:px-12 lg:py-6 overflow-hidden font-sans text-slate-900 dark:text-slate-100 select-none box-border">
      {/* Framed Card Container with generous side margins */}
      <div className="flex-1 flex flex-col min-h-0 min-w-0 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* 1. Dedicated Top Navigation Bar */}
        <header className="shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-2.5 flex items-center justify-between gap-3 shadow-2xs z-30">
          {/* Left: Employee Info & Identification */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-2xs">
              {baseEmployeeInfo.employeeName ? baseEmployeeInfo.employeeName.charAt(0).toUpperCase() : 'E'}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                  {baseEmployeeInfo.employeeName || 'Legacy Paybill Editor'}
                </h1>
                {baseEmployeeInfo.designation && (
                  <span className="text-xs text-slate-500 dark:text-slate-400 truncate hidden sm:inline">
                    · {baseEmployeeInfo.designation}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                  HRPN: {baseEmployeeInfo.hrpn || hrpn || '—'}
                </span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <Calendar size={11} /> FY {fyLabel}
                </span>
                {baseEmployeeInfo.payScale && (
                  <>
                    <span>·</span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {baseEmployeeInfo.payScale}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Center: Search & Month filter controls */}
          <div className="hidden lg:flex items-center gap-2">
            <div className="relative w-44">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter parameter..."
                className="w-full pl-7 pr-2.5 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:border-amber-500 outline-none text-slate-700 dark:text-slate-200"
              />
            </div>
            <select
              value={monthFilter.length === 0 ? '' : monthFilter[0]}
              onChange={(e) => setMonthFilter(e.target.value ? [e.target.value] : [])}
              className="px-2.5 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:border-amber-500 outline-none text-slate-700 dark:text-slate-200"
            >
              <option value="">All 12 Months</option>
              {MONTH_ORDER.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {dirtyRows.size > 0 && (
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                {dirtyRows.size} modified
              </span>
            )}

            <button
              type="button"
              onClick={() => void handleSaveAll()}
              disabled={saving || dirtyRows.size === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs"
              title="Save changes (Ctrl + S)"
            >
              <Save size={13} />
              <span>{saving ? 'Saving...' : 'Save Draft'}</span>
            </button>

            <button
              type="button"
              onClick={() => void handleSaveAndClose()}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition disabled:opacity-50"
              title="Save changes and close window"
            >
              <Check size={13} />
              <span>Save & Close</span>
            </button>

            <button
              type="button"
              onClick={handleClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
              title="Close Window (Esc)"
            >
              <X size={16} />
            </button>
          </div>
        </header>

        {/* 2. Compact Financial Summary Bar */}
        <div className="shrink-0 bg-slate-50 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 px-4 py-1.5 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4 font-mono text-xs">
            <div className="flex items-baseline gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Gross:</span>
              <span className="font-extrabold text-slate-900 dark:text-slate-100">{formatInr(totalGross)}</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500">Deductions:</span>
              <span className="font-extrabold text-rose-700 dark:text-rose-400">{formatInr(totalDeductions)}</span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">Net Take-Home:</span>
              <span className="font-extrabold text-emerald-700 dark:text-emerald-300">{formatInr(totalNet)}</span>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 hidden sm:flex items-center gap-1.5">
            <span>Excel Paste: <kbd className="font-mono px-1 py-0.2 bg-slate-200 dark:bg-slate-800 rounded text-[10px]">Ctrl+V</kbd></span>
          </div>
        </div>

        {/* 3. Main Full-Bleed 100% Native Scale Matrix Table */}
        <main
          className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden app-scroll bg-white dark:bg-slate-900"
          ref={tableContainerRef}
        >
          {loading ? (
            <div className="h-full flex items-center justify-center text-slate-400 text-xs">
              <div className="flex flex-col items-center gap-2">
                <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                <span>Loading employee salary records...</span>
              </div>
            </div>
          ) : (
            <table className="w-full table-fixed text-xs text-left border-separate border-spacing-0">
              <colgroup>
                <col className="w-[15%]" />
                {visibleMonths.map((m) => (
                  <col key={m} style={{ width: `${(77 / visibleMonths.length).toFixed(2)}%` }} />
                ))}
                <col className="w-[8%]" />
              </colgroup>

              <thead className="bg-slate-100 dark:bg-slate-800/95 text-slate-700 dark:text-slate-300 uppercase tracking-wider sticky top-0 z-20 shadow-2xs">
                <tr>
                  <th className="py-2 px-3 font-bold border-b border-r border-slate-200 dark:border-slate-700 sticky left-0 bg-slate-100 dark:bg-slate-800 z-30 truncate text-[11px]">
                    Parameter
                  </th>
                  {visibleMonths.map((m) => {
                    const idx = MONTH_ORDER.indexOf(m);
                    const canCopy = idx > 0 && visibleMonths.includes(MONTH_ORDER[idx - 1]);
                    const shortName = MONTH_SHORT[idx] || m.slice(0, 3);
                    const monthHasData = getMonthGross(m) > 0 || (draftDeductions[m]?.totalDeductions || 0) > 0;
                    return (
                      <th
                        key={m}
                        className="py-2 px-1.5 font-bold border-b border-r border-slate-200 dark:border-slate-700 text-right"
                      >
                        <div className="flex items-center justify-end gap-1 min-w-0">
                          <span className="truncate text-[11px]" title={m}>{shortName}</span>
                          {canCopy && (
                            <button
                              type="button"
                              title={`Copy ${MONTH_ORDER[idx - 1]} data into ${m}`}
                              onClick={() => copyFromPreviousMonth(m)}
                              className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-amber-600 transition shrink-0"
                            >
                              <Copy size={10} />
                            </button>
                          )}
                          {monthHasData && (
                            <button
                              type="button"
                              title={`Clear all data for ${m}`}
                              onClick={() => clearMonthData(m)}
                              className="p-0.5 rounded hover:bg-rose-100 dark:hover:bg-rose-950/60 text-slate-400 hover:text-rose-600 transition shrink-0"
                            >
                              <RotateCcw size={10} />
                            </button>
                          )}
                        </div>
                      </th>
                    );
                  })}
                  <th className="py-2 px-2 font-bold border-b border-slate-200 dark:border-slate-700 text-right bg-slate-200/70 dark:bg-slate-700/70 text-[11px] truncate">
                    Annual
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {/* SECTION: EARNINGS */}
                {(filteredEarningRows.length > 0 || filteredManualRows.length > 0) && (
                  <tr className="bg-blue-50/90 dark:bg-blue-950/60 sticky z-10">
                    <td
                      colSpan={visibleMonths.length + 2}
                      className="py-1 px-3 font-bold text-[10px] uppercase tracking-wider text-blue-900 dark:text-blue-200"
                    >
                      EARNING (₹)
                    </td>
                  </tr>
                )}

                {/* 1. Standard Earning Rows */}
                {filteredEarningRows.map((col, rIdx) => {
                  const rowKey = `earn-${col.key}`;
                  const isDirty = dirtyRows.has(rowKey);
                  const isEven = rIdx % 2 === 0;
                  const total = visibleMonths.reduce(
                    (s, m) => s + ((draftEarnings[m]?.[col.key as keyof PayBillStoredEarning] as number) || 0),
                    0
                  );
                  return (
                    <tr
                      key={col.key}
                      className={`transition-colors ${
                        isDirty
                          ? 'bg-amber-50/50 dark:bg-amber-900/25'
                          : isEven
                            ? 'bg-slate-50/60 dark:bg-slate-850/40'
                            : 'bg-white dark:bg-slate-900'
                      } hover:bg-blue-50/50 dark:hover:bg-blue-950/30`}
                    >
                      <td
                        className={`py-1.5 px-3 font-semibold text-slate-800 dark:text-slate-200 sticky left-0 z-10 border-r border-b border-slate-200/80 dark:border-slate-800 truncate ${
                          isDirty
                            ? 'bg-amber-50/95 dark:bg-amber-900/60'
                            : isEven
                              ? 'bg-slate-50/95 dark:bg-slate-850/95'
                              : 'bg-white dark:bg-slate-900'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 min-w-0">
                          <span className="truncate text-xs" title={col.label}>{col.label}</span>
                          {isDirty && (
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" title="Modified" />
                          )}
                        </div>
                      </td>
                      {visibleMonths.map((m) => {
                        const val = (draftEarnings[m]?.[col.key as keyof PayBillStoredEarning] as number) ?? 0;
                        const monthIdx = MONTH_ORDER.indexOf(m);
                        return (
                          <td key={m} className="p-0 border-r border-b border-slate-200/70 dark:border-slate-800/70">
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
                              className="w-full text-right bg-transparent hover:bg-white/80 dark:hover:bg-slate-800/80 focus:bg-blue-50/90 dark:focus:bg-blue-950/70 border-0 focus:ring-1.5 focus:ring-blue-500 rounded-none px-1.5 py-1.5 font-mono text-xs text-slate-900 dark:text-slate-100 outline-none transition"
                            />
                          </td>
                        );
                      })}
                      <td className="py-1.5 px-2 text-right font-mono font-bold text-slate-900 dark:text-slate-100 bg-slate-100/70 dark:bg-slate-800/50 border-b border-slate-200/80 dark:border-slate-800 truncate text-xs">
                        {total > 0 ? formatInr(total) : <span className="text-slate-400 font-sans font-normal">—</span>}
                      </td>
                    </tr>
                  );
                })}

                {/* 2. Manual Difference Rows */}
                {filteredManualRows.map((label, rIdx) => {
                  const rowKey = `manual-${label}`;
                  const isDirty = dirtyRows.has(rowKey);
                  const isEven = (filteredEarningRows.length + rIdx) % 2 === 0;
                  const rowVals = draftManual[label] || {};
                  const total = visibleMonths.reduce((s, m) => s + (rowVals[m] || 0), 0);

                  return (
                    <tr
                      key={rowKey}
                      className={`group transition-colors ${
                        isDirty
                          ? 'bg-amber-50/60 dark:bg-amber-900/30'
                          : isEven
                            ? 'bg-slate-50/60 dark:bg-slate-850/40'
                            : 'bg-white dark:bg-slate-900'
                      } hover:bg-blue-50/50 dark:hover:bg-blue-950/30`}
                    >
                      <td
                        className={`py-1.5 px-3 font-semibold text-slate-800 dark:text-slate-200 sticky left-0 z-10 border-r border-b border-slate-200/80 dark:border-slate-800 truncate ${
                          isDirty
                            ? 'bg-amber-50/95 dark:bg-amber-900/60'
                            : isEven
                              ? 'bg-slate-50/95 dark:bg-slate-850/95'
                              : 'bg-white dark:bg-slate-900'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 min-w-0">
                          <div className="flex items-center gap-1.5 min-w-0 truncate">
                            <span className="truncate text-xs" title={label}>{label}</span>
                            <span className="px-1.5 py-0.2 text-[9px] font-bold uppercase rounded bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 shrink-0">
                              Arr
                            </span>
                          </div>
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <button
                              type="button"
                              onClick={() => handleFillForwardManual(label)}
                              title="Replicate first amount across all months"
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
                        </div>
                      </td>
                      {visibleMonths.map((m) => {
                        const val = rowVals[m] || 0;
                        const monthIdx = MONTH_ORDER.indexOf(m);
                        return (
                          <td key={m} className="p-0 border-r border-b border-slate-200/70 dark:border-slate-800/70">
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
                              className={`w-full text-right px-1.5 py-1.5 font-mono text-xs outline-none transition ${
                                val > 0
                                  ? 'font-bold text-amber-900 dark:text-amber-200 bg-amber-50/70 dark:bg-amber-950/40 border-0 focus:ring-1.5 focus:ring-amber-500'
                                  : 'bg-transparent hover:bg-white/80 dark:hover:bg-slate-800/80 border-0 focus:ring-1.5 focus:ring-blue-500 focus:bg-blue-50/90 dark:focus:bg-blue-950/70 text-slate-900 dark:text-slate-100'
                              }`}
                            />
                          </td>
                        );
                      })}
                      <td className="py-1.5 px-2 text-right font-mono font-bold text-amber-900 dark:text-amber-200 bg-amber-50/80 dark:bg-amber-950/40 border-b border-slate-200/80 dark:border-slate-800 truncate text-xs">
                        {total > 0 ? formatInr(total) : <span className="text-slate-400 font-sans font-normal">—</span>}
                      </td>
                    </tr>
                  );
                })}

                {/* 3. Gross Amount Row */}
                {(filteredEarningRows.length > 0 || filteredManualRows.length > 0) && (
                  <tr className="bg-blue-100/70 dark:bg-blue-950/60 font-bold border-t border-b border-blue-200 dark:border-blue-900">
                    <td className="py-2 px-3 text-blue-900 dark:text-blue-200 sticky left-0 bg-blue-100/95 dark:bg-blue-950/95 z-10 border-r border-blue-200 dark:border-blue-900 truncate text-xs">
                      Gross Amount
                    </td>
                    {visibleMonths.map((m) => {
                      const gross = getMonthGross(m);
                      return (
                        <td key={m} className="py-2 px-1.5 text-right font-mono text-blue-800 dark:text-blue-200 border-r border-blue-200/60 dark:border-blue-900/60 truncate text-xs">
                          {gross > 0 ? formatInr(gross) : <span className="text-slate-400 font-sans font-normal">—</span>}
                        </td>
                      );
                    })}
                    <td className="py-2 px-2 text-right font-mono font-extrabold text-blue-900 dark:text-blue-100 bg-blue-200/80 dark:bg-blue-900/70 truncate text-xs">
                      {totalGross > 0 ? formatInr(totalGross) : <span className="text-slate-400 font-sans font-normal">—</span>}
                    </td>
                  </tr>
                )}

                {/* SECTION: DEDUCTIONS */}
                {filteredDeductionRows.length > 0 && (
                  <tr className="bg-rose-50/90 dark:bg-rose-950/60 sticky z-10">
                    <td
                      colSpan={visibleMonths.length + 2}
                      className="py-1.5 px-3 font-bold text-[10px] uppercase tracking-wider text-rose-900 dark:text-rose-200"
                    >
                      DEDUCTION (₹)
                    </td>
                  </tr>
                )}

                {filteredDeductionRows.map((col, rIdx) => {
                  const rowKey = `ded-${col.key}`;
                  const isDirty = dirtyRows.has(rowKey);
                  const isEven = rIdx % 2 === 0;
                  const total = visibleMonths.reduce(
                    (s, m) => s + ((draftDeductions[m]?.[col.key as keyof PayBillStoredDeduction] as number) || 0),
                    0
                  );
                  return (
                    <tr
                      key={col.key}
                      className={`transition-colors ${
                        isDirty
                          ? 'bg-amber-50/50 dark:bg-amber-900/25'
                          : isEven
                            ? 'bg-slate-50/60 dark:bg-slate-850/40'
                            : 'bg-white dark:bg-slate-900'
                      } hover:bg-rose-50/50 dark:hover:bg-rose-950/30`}
                    >
                      <td
                        className={`py-1.5 px-3 font-semibold text-slate-800 dark:text-slate-200 sticky left-0 z-10 border-r border-b border-slate-200/80 dark:border-slate-800 truncate ${
                          isDirty
                            ? 'bg-amber-50/95 dark:bg-amber-900/60'
                            : isEven
                              ? 'bg-slate-50/95 dark:bg-slate-850/95'
                              : 'bg-white dark:bg-slate-900'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 min-w-0">
                          <span className="truncate text-xs" title={col.label}>{col.label}</span>
                          {isDirty && (
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" title="Modified" />
                          )}
                        </div>
                      </td>
                      {visibleMonths.map((m) => {
                        const val = (draftDeductions[m]?.[col.key as keyof PayBillStoredDeduction] as number) ?? 0;
                        const monthIdx = MONTH_ORDER.indexOf(m);
                        return (
                          <td key={m} className="p-0 border-r border-b border-slate-200/70 dark:border-slate-800/70">
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
                              className="w-full text-right bg-transparent hover:bg-white/80 dark:hover:bg-slate-800/80 focus:bg-rose-50/90 dark:focus:bg-rose-950/70 border-0 focus:ring-1.5 focus:ring-rose-500 rounded-none px-1.5 py-1.5 font-mono text-xs text-slate-900 dark:text-slate-100 outline-none transition"
                            />
                          </td>
                        );
                      })}
                      <td className="py-1.5 px-2 text-right font-mono font-bold text-slate-900 dark:text-slate-100 bg-slate-100/70 dark:bg-slate-800/50 border-b border-slate-200/80 dark:border-slate-800 truncate text-xs">
                        {total > 0 ? formatInr(total) : <span className="text-slate-400 font-sans font-normal">—</span>}
                      </td>
                    </tr>
                  );
                })}

                {/* Total Deductions Row */}
                {filteredDeductionRows.length > 0 && (
                  <tr className="bg-rose-100/70 dark:bg-rose-950/60 font-bold border-t border-b border-rose-200 dark:border-rose-900">
                    <td className="py-2 px-3 text-rose-900 dark:text-rose-200 sticky left-0 bg-rose-100/95 dark:bg-rose-950/95 z-10 border-r border-rose-200 dark:border-rose-900 truncate text-xs">
                      Total Deductions
                    </td>
                    {visibleMonths.map((m) => {
                      const ded = draftDeductions[m]?.totalDeductions || 0;
                      return (
                        <td key={m} className="py-2 px-1.5 text-right font-mono text-rose-800 dark:text-rose-200 border-r border-rose-200/60 dark:border-rose-900/60 truncate text-xs">
                          {ded > 0 ? formatInr(ded) : <span className="text-slate-400 font-sans font-normal">—</span>}
                        </td>
                      );
                    })}
                    <td className="py-2 px-2 text-right font-mono font-extrabold text-rose-900 dark:text-rose-100 bg-rose-200/80 dark:bg-rose-900/70 truncate text-xs">
                      {totalDeductions > 0 ? formatInr(totalDeductions) : <span className="text-slate-400 font-sans font-normal">—</span>}
                    </td>
                  </tr>
                )}

                {/* Net Pay Row */}
                {filteredDeductionRows.length > 0 && (
                  <tr className="bg-emerald-100/70 dark:bg-emerald-950/60 font-bold border-b border-emerald-200 dark:border-emerald-900">
                    <td className="py-2 px-3 text-emerald-900 dark:text-emerald-200 sticky left-0 bg-emerald-100/95 dark:bg-emerald-950/95 z-10 border-r border-emerald-200 dark:border-emerald-900 truncate text-xs">
                      Net Take-Home Pay
                    </td>
                    {visibleMonths.map((m) => {
                      const gross = getMonthGross(m);
                      const ded = draftDeductions[m]?.totalDeductions || 0;
                      const net = gross - ded;
                      const hasData = gross > 0 || ded > 0;
                      return (
                        <td key={m} className="py-2 px-1.5 text-right font-mono text-emerald-800 dark:text-emerald-200 border-r border-emerald-200/60 dark:border-emerald-900/60 truncate text-xs">
                          {hasData ? formatInr(net) : <span className="text-slate-400 font-sans font-normal">—</span>}
                        </td>
                      );
                    })}
                    <td className="py-2 px-2 text-right font-mono font-extrabold text-emerald-900 dark:text-emerald-100 bg-emerald-200/80 dark:bg-emerald-900/70 truncate text-xs">
                      {totalGross > 0 || totalDeductions > 0 ? formatInr(totalNet) : <span className="text-slate-400 font-sans font-normal">—</span>}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </main>

        {/* 4. Floating / Sticky Bottom Batch Save Bar */}
        {dirtyRows.size > 0 && (
          <footer className="shrink-0 bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between gap-2 shadow-xl border-t border-slate-800 z-40 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="flex items-center gap-2 text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
              <span className="font-semibold text-amber-300">
                {dirtyRows.size} parameter{dirtyRows.size > 1 ? 's' : ''} modified
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDiscard}
                className="px-3 py-1 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition"
              >
                Discard
              </button>

              <button
                type="button"
                onClick={() => void handleSaveAll()}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-4 py-1 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-sm transition disabled:opacity-50"
              >
                <Save size={13} />
                <span>{saving ? 'Saving...' : 'Save Changes (Ctrl + S)'}</span>
              </button>
            </div>
          </footer>
        )}
      </div>
    </div>
  );
}
