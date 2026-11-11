import type { WorkBook } from 'xlsx';
import { supabase } from '@/core/supabase/client';
import { salaryRepository } from '../repositories/salary.repository';
import { employeeService } from './employee.service';
import { toCanonicalHrpn, buildLegacyBridge, resolveLegacyId } from '@/shared/domain/canonicalEmployee';
import { normalizePan } from '@/shared/domain/employeeIdentity';
import { parseSalaryExcel } from '../utils/salaryParser';
import type { ClassifiedSalaryRecord, ParsedSalaryRecord, SalaryImportSummary, SalaryPreviewSummary } from '../validation/salary.schema';

function fileToArray(rows: unknown[][]): string[][] {
  return rows.map((row) =>
    (row == null ? [] as unknown[] : row).map((c) => (c == null ? '' : String(c).trim()))
  );
}

function scoreSheetGrid(grid: unknown[][]): number {
  // Heuristic: count header-like signals in the first 10 rows so we pick
  // the payout table over cover/instruction sheets.
  let score = 0;
  const limit = Math.min(grid.length, 10);
  for (let r = 0; r < limit; r++) {
    const row = grid[r] || [];
    for (const cell of row as unknown[]) {
      const s = String(cell ?? '').toLowerCase();
      if (!s) continue;
      if (/(hrpn|hprn)/.test(s)) score += 3;
      else if (s.includes('gross') || s.includes('salary') || s.includes('tds') || s.includes('income tax') || s === 'tax' || s === 'it') score += 2;
      else if (/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[-/.\s'’`]?\s*\d{2,4}\b/.test(s)) score += 2;
      else if (/\b(january|february|march|april|june|july|august|september|october|november|december)\b/.test(s)) score += 1;
    }
  }
  return score;
}

class SalaryService {
  async readExcelRows(file: File): Promise<unknown[][]> {
    const [{ read, utils }] = await Promise.all([import('xlsx')]);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook: WorkBook = read(data, { type: 'array' });
          if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
            throw new Error('Excel file has no worksheets');
          }
          // Karmayogi downloads sometimes put instructions/cover on the
          // first sheet and the payout table on a later one. Score every
          // sheet for salary-table signals and read the best one instead
          // of blindly taking SheetNames[0]. Every sheet is scored — an
          // early exit on the first plausible sheet used to lock onto a
          // cover/instruction sheet and yield 0 records.
          let bestGrid: unknown[][] | null = null;
          let bestScore = -1;
          for (const name of workbook.SheetNames) {
            const sheet = workbook.Sheets[name];
            if (!sheet) continue;
            const json = utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' }) as unknown[][];
            const score = scoreSheetGrid(json);
            if (score > bestScore) {
              bestScore = score;
              bestGrid = json;
            }
          }
          if (!bestGrid) throw new Error('Excel file has no readable worksheets');
          resolve(fileToArray(bestGrid));
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(file);
    });
  }

  private deriveFinancialYear(records: ParsedSalaryRecord[], fallbackFy?: number): number {
    const counts = new Map<number, number>();
    for (const r of records) {
      if (Number.isFinite(r.financialYear) && r.financialYear > 0) {
        counts.set(r.financialYear, (counts.get(r.financialYear) || 0) + 1);
      }
    }
    let bestFy = 0;
    let bestCount = -1;
    for (const [fyStr, cnt] of counts) {
      const fy = Number(fyStr);
      if (cnt > bestCount || (cnt === bestCount && fy > bestFy)) {
        bestCount = cnt;
        bestFy = fy;
      }
    }
    if (bestFy > 0) return bestFy;
    if (fallbackFy != null && Number.isFinite(fallbackFy)) return fallbackFy;
    return bestFy;
  }

  async classifyRows(
    rows: unknown[][],
    fallback?: { month?: string; financialYear?: number }
  ): Promise<{
    classified: ClassifiedSalaryRecord[];
    summary: Omit<SalaryPreviewSummary, 'fileName'>;
  }> {
    const parse = parseSalaryExcel(rows, {
      fallbackMonth: fallback?.month,
      fallbackFinancialYear: fallback?.financialYear,
    });
    const employees = await employeeService.listEmployees();
    // Legacy payroll-row bridge (HRPN wins, PAN is the fallback — same rule
    // as migration 051). `employee_salaries` is still keyed by legacy
    // `employees.id`, so every match must resolve to a legacy row id.
    const bridge = buildLegacyBridge(
      employees.map((e) => ({ id: e.id, hprn_no: e.hprn_no, pan: e.pan }))
    );

    // Establishment-first identity: the canonical register owns HRPN/PAN
    // truth post-056. A file HRPN that misses the legacy row directly may
    // still resolve via the canonical row's PAN (same person, HRPN recorded
    // differently in the legacy master). A failure here must never break the
    // import — degrade to legacy-only matching.
    const canonicalPanByHrpn = new Map<string, string>();
    try {
      const { data: canonicalRows, error: canonicalError } = await supabase
        .from('establishment_employees')
        .select('hrpn_no, pan');
      if (!canonicalError && canonicalRows) {
        for (const r of canonicalRows as Array<{ hrpn_no: string | null; pan: string | null }>) {
          const hrpn = toCanonicalHrpn(r.hrpn_no);
          const pan = normalizePan(r.pan);
          if (hrpn && pan && !canonicalPanByHrpn.has(hrpn)) canonicalPanByHrpn.set(hrpn, pan);
        }
      }
    } catch (err) {
      console.warn('[SalaryImport] Canonical register lookup failed, matching legacy only:', err);
    }

    const resolveEmployeeId = (rec: ParsedSalaryRecord): string | null => {
      // 1-2. Direct legacy hit: HRPN first, then the file's PAN column.
      const direct = resolveLegacyId(rec.hprnNo, rec.pan, bridge);
      if (direct) return direct;
      // 3. Canonical hop: file HRPN -> canonical row -> its PAN -> legacy row.
      const hrpn = toCanonicalHrpn(rec.hprnNo);
      if (hrpn) {
        const canonicalPan = canonicalPanByHrpn.get(hrpn);
        if (canonicalPan) {
          const viaPan = bridge.byPan.get(canonicalPan);
          if (viaPan) return viaPan;
        }
      }
      return null;
    };

    const classified: ClassifiedSalaryRecord[] = [];
    for (const rec of parse.records) {
      const employeeId = resolveEmployeeId(rec);
      classified.push({
        ...rec,
        employeeId,
        status: employeeId ? 'matched' : 'unmatched',
      });
    }

    const matched = classified.filter((c) => c.status === 'matched').length;
    const unmatched = classified.filter((c) => c.status === 'unmatched').length;

    const months = Array.from(
      new Set(parse.monthColumns.map((mc) => `${mc.month}|${mc.financialYear}`))
    ).map((key) => {
      const idx = key.lastIndexOf('|');
      return { month: key.slice(0, idx), financialYear: Number(key.slice(idx + 1)) };
    });

    const summary: Omit<SalaryPreviewSummary, 'fileName'> = {
      totalRecords: classified.length,
      matchedRecords: matched,
      unmatchedRecords: unmatched,
      duplicateRecords: parse.duplicateCount,
      invalidRecords: parse.invalidCount,
      grossColumns: parse.monthColumns.filter((mc) => mc.type === 'gross').length,
      incomeTaxColumns: parse.monthColumns.filter((mc) => mc.type === 'income_tax').length,
      months,
      distinctHrpnCount: parse.distinctHrpnCount,
      hrpnColumnHeader: parse.hrpnColumnHeader,
    };

    return { classified, summary };
  }

  async importSalary(
    file: File,
    fallback?: { month?: string; financialYear?: number }
  ): Promise<SalaryImportSummary> {
    const rows = await this.readExcelRows(file);
    const { classified, summary } = await this.classifyRows(rows, fallback);

    const financialYear = this.deriveFinancialYear(classified, fallback?.financialYear);
    const matchedCount = classified.filter((c) => c.status === 'matched').length;

    let importRecord: { id: string } | null = null;
    try {
      importRecord = await salaryRepository.createImport({
        excelFilename: file.name,
        financialYear,
        totalRecords: classified.length,
        matchedCount,
      });
    } catch (err) {
      console.warn('[SalaryImport] Could not create import record:', err);
    }

    if (importRecord) {
      const salaryRows = classified.map((c) => ({
        salary_import_id: importRecord.id,
        employee_id: c.employeeId,
        hprn_no: c.hprnNo,
        name: c.name ?? null,
        month: c.month,
        financial_year: c.financialYear,
        gross_salary: c.grossSalary,
        income_tax: c.incomeTax,
        status: c.status,
      }));

      try {
        await salaryRepository.upsertSalaries(salaryRows);
      } catch (err) {
        console.warn('[SalaryImport] Could not write lookup rows:', err);
      }
    }

    const appliedToGrid = await salaryRepository.upsertToPayrollGrid(classified);

    return {
      importId: importRecord?.id ?? '',
      total: classified.length,
      matched: matchedCount,
      unmatched: classified.filter((c) => c.status === 'unmatched').length,
      duplicate: summary.duplicateRecords,
      notDetected: 0,
      appliedToGrid,
    };
  }
}

export const salaryService = new SalaryService();
