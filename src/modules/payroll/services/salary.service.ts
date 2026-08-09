import { read, utils, type WorkBook } from 'xlsx';
import { salaryRepository } from '../repositories/salary.repository';
import { employeeService } from './employee.service';
import { parseSalaryExcel } from '../utils/salaryParser';
import type { ClassifiedSalaryRecord, ParsedSalaryRecord, SalaryImportSummary, SalaryPreviewSummary } from '../validation/salary.schema';

function fileToArray(rows: unknown[][]): string[][] {
  return rows.map((row) =>
    (row == null ? [] as unknown[] : row).map((c) => (c == null ? '' : String(c).trim()))
  );
}

export class SalaryService {
  async readExcelRows(file: File): Promise<unknown[][]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook: WorkBook = read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          if (!sheetName) throw new Error('Excel file has no worksheets');
          const sheet = workbook.Sheets[sheetName];
          const json = utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' }) as unknown[][];
          resolve(fileToArray(json));
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(file);
    });
  }

  private deriveFinancialYear(records: ParsedSalaryRecord[]): number {
    const counts = new Map<number, number>();
    for (const r of records) counts.set(r.financialYear, (counts.get(r.financialYear) || 0) + 1);
    let bestFy = 0;
    let bestCount = -1;
    for (const [fyStr, cnt] of counts) {
      const fy = Number(fyStr);
      if (cnt > bestCount || (cnt === bestCount && fy > bestFy)) {
        bestCount = cnt;
        bestFy = fy;
      }
    }
    return bestFy;
  }

  async classifyRows(rows: unknown[][]): Promise<{
    classified: ClassifiedSalaryRecord[];
    summary: Omit<SalaryPreviewSummary, 'fileName'>;
  }> {
    const parse = parseSalaryExcel(rows);
    const employees = await employeeService.listEmployees();
    const empMap = new Map<string, { id: string; name: string | null }>();
    for (const e of employees) {
      if (e.hprn_no) empMap.set(e.hprn_no.toLowerCase().trim(), { id: e.id, name: e.name });
    }

    const classified: ClassifiedSalaryRecord[] = [];
    for (const rec of parse.records) {
      const emp = empMap.get(rec.hprnNo.toLowerCase().trim());
      classified.push({
        ...rec,
        employeeId: emp?.id ?? null,
        status: emp ? 'matched' : 'unmatched',
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

  async previewImport(file: File): Promise<SalaryPreviewSummary & { classified: ClassifiedSalaryRecord[] }> {
    const rows = await this.readExcelRows(file);
    const { classified, summary } = await this.classifyRows(rows);
    return { fileName: file.name, ...summary, classified };
  }

  async importSalary(file: File): Promise<SalaryImportSummary> {
    const rows = await this.readExcelRows(file);
    const { classified } = await this.classifyRows(rows);

    const financialYear = this.deriveFinancialYear(classified);
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
      duplicate: 0,
      notDetected: 0,
      appliedToGrid,
    };
  }
}

export const salaryService = new SalaryService();
