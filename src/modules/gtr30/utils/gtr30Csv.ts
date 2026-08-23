import type { GTR30EmployeeMaster } from '../types';
import { resolveDARateForMonthKey } from './gtr30GovRules';
import { gtr30SettingsService } from '../services/gtr30Settings.service';
import { gtr30EmployeeMasterSchema } from '../validation/gtr30EmployeeMaster.schema';

export const CSV_HEADERS = [
  'Sr No',
  'HRPN No',
  'Employee Name',
  'Designation',
  'Designation Gujarati',
  'Cadre Class',
  'Pay Scale',
  'Grade Pay',
  'Pay Level Cell',
  'PPA No',
  'Current Pay',
  'Pay Increment Date',
  'Quarter Address',
  'GIS Group',
  'Insurance Type',
  'HRA Percent',
  'DA',
  'Transport Allowance',
  'Medical Allowance',
  'CLA Allowance',
  'Rent of Building',
  'Professional Tax',
  'GIS Insurance Fund',
  'GIS Savings Fund',
  'NPS Pension',
  'Society Deduction',
  'Remarks',
] as const;

function escapeCsvField(val: unknown): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportMasterToCsv(employees: GTR30EmployeeMaster[]): string {
  const lines: string[] = [];
  lines.push(CSV_HEADERS.join(','));

  for (const emp of employees) {
    const row = [
      escapeCsvField(emp.srNo),
      escapeCsvField(emp.hrpnNo || ''),
      escapeCsvField(emp.name),
      escapeCsvField(emp.designation || ''),
      escapeCsvField(emp.designationGujarati || ''),
      escapeCsvField(emp.cadreClass || ''),
      escapeCsvField(emp.payScale || ''),
      escapeCsvField(emp.gradePay || ''),
      escapeCsvField(emp.payLevelCell || ''),
      escapeCsvField(emp.ppaNo || ''),
      escapeCsvField(emp.currentPay || 0),
      escapeCsvField(emp.currentPayDate || ''),
      escapeCsvField(emp.quarterAddress || ''),
      escapeCsvField(emp.insuranceGroup || ''),
      escapeCsvField(emp.insuranceType || 'savings_and_insurance'),
      escapeCsvField(emp.hraPercent || 0),
      escapeCsvField(emp.da || 0),
      escapeCsvField(emp.transportAllowance || 0),
      escapeCsvField(emp.medicalAllowance || 0),
      escapeCsvField(emp.claAllowance || 0),
      escapeCsvField(emp.rentOfBuilding || 0),
      escapeCsvField(emp.professionalTax || 0),
      escapeCsvField(emp.gis1981Insurance || 0),
      escapeCsvField(emp.gis1981Savings || 0),
      escapeCsvField(emp.npsPension || 0),
      escapeCsvField(emp.societyDeduction || 0),
      escapeCsvField(emp.remarks || ''),
    ];
    lines.push(row.join(','));
  }

  return lines.join('\n');
}

export function generateSampleCsvTemplate(): string {
  const sampleRows: Partial<GTR30EmployeeMaster>[] = [
    {
      srNo: 1,
      hrpnNo: '100123',
      name: 'Shri R.B. Makvana',
      designation: 'Research Assistant',
      designationGujarati: 'સંશોધન મદદનીશ',
      cadreClass: '',
      payScale: '',
      gradePay: '',
      payLevelCell: '',
      ppaNo: '',
      currentPay: 39900,
      currentPayDate: '2026-07-01',
      quarterAddress: 'H-7, Government Quarters, Khatodara, Surat',
      insuranceGroup: '',
      insuranceType: 'savings_and_insurance',
      hraPercent: 0,
      da: 0,
      transportAllowance: 0,
      medicalAllowance: 0,
      claAllowance: 0,
      rentOfBuilding: 0,
      professionalTax: 0,
      gis1981Insurance: 0,
      gis1981Savings: 0,
      npsPension: 0,
      societyDeduction: 0,
      remarks: '',
    },
  ];

  return exportMasterToCsv(sampleRows as GTR30EmployeeMaster[]);
}

export interface CsvImportResult {
  employees: GTR30EmployeeMaster[];
  skippedRows: number;
  errors: string[];
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentField += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentField.trim());
        currentField = '';
      } else if (char === '\n' || char === '\r') {
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
        currentRow.push(currentField.trim());
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
      } else {
        currentField += char;
      }
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    rows.push(currentRow);
  }

  return rows.filter((row) => row.some((field) => field.length > 0));
}

export function parseCsvLine(text: string): string[] {
  const result: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentField += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        result.push(currentField.trim());
        currentField = '';
      } else {
        currentField += char;
      }
    }
  }

  result.push(currentField.trim());
  return result;
}

function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function getField(rowObj: Record<string, string>, keys: string[]): string {
  for (const key of keys) {
    if (rowObj[key] !== undefined && rowObj[key] !== '') {
      return rowObj[key];
    }
  }
  return '';
}

export function importMasterFromCsv(csvText: string, monthKey?: string): CsvImportResult {
  const rows = parseCsv(csvText);
  const result: CsvImportResult = {
    employees: [],
    skippedRows: 0,
    errors: [],
  };

  if (rows.length <= 1) {
    return result;
  }

  const headers = rows[0].map(normalizeHeader);
  const settings = gtr30SettingsService.loadSettings();
  const daRates = settings.daRates;

  for (let i = 1; i < rows.length; i++) {
    const cols = rows[i];
    if (cols.length === 0 || !cols.some(Boolean)) {
      result.skippedRows++;
      continue;
    }

    const rowObj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      if (idx < cols.length) {
        rowObj[h] = cols[idx];
      }
    });

    const name = getField(rowObj, ['employeename', 'name']);
    if (!name || name.length < 2) {
      result.skippedRows++;
      result.errors.push(`Row ${i + 1}: Skipped - employee name missing or too short`);
      continue;
    }

    const currentPay = Number(getField(rowObj, ['currentpay', 'basicpay'])) || 0;
    const currentPayDate = getField(rowObj, ['payincrementdate', 'currentpaydate']);
    const daPercent = resolveDARateForMonthKey(daRates, monthKey);
    const da = rowObj['da'] ? Number(rowObj['da']) : Math.round(currentPay * (daPercent / 100));
    const nps = rowObj['npspension'] ? Number(rowObj['npspension']) : Math.round((currentPay + da) * 0.1);

    const partialEmployee: Partial<GTR30EmployeeMaster> = {
      srNo: Number(rowObj['srno']) || i,
      hrpnNo: getField(rowObj, ['hrpnno', 'hrpn']) || undefined,
      name,
      designation: getField(rowObj, ['designation']),
      designationGujarati: getField(rowObj, ['designationgujarati']),
      cadreClass: getField(rowObj, ['cadreclass']),
      payScale: getField(rowObj, ['payscale']),
      gradePay: getField(rowObj, ['gradepay']),
      payLevelCell: getField(rowObj, ['paylevelcell']),
      ppaNo: getField(rowObj, ['ppano']),
      currentPay,
      currentPayDate,
      quarterAddress: getField(rowObj, ['quarteraddress']),
      insuranceGroup: getField(rowObj, ['gisgroup', 'insurancegroup']),
      insuranceType: getField(rowObj, ['insurancetype']) === 'insurance_only' ? 'insurance_only' : 'savings_and_insurance',
      hraPercent: Number(rowObj['hrapercent']) || 0,
      da,
      transportAllowance: Number(rowObj['transportallowance']) || 0,
      medicalAllowance: Number(rowObj['medicalallowance']) || 0,
      claAllowance: Number(rowObj['claallowance']) || 0,
      rentOfBuilding: Number(rowObj['rentofbuilding']) || 0,
      professionalTax: Number(rowObj['professionaltax']) || 0,
      gis1981Insurance: Number(getField(rowObj, ['gisinsurancefund', 'gis1981insurance'])) || 0,
      gis1981Savings: Number(getField(rowObj, ['gissavingsfund', 'gis1981savings'])) || 0,
      npsPension: nps,
      societyDeduction: Number(rowObj['societydeduction']) || 0,
      remarks: getField(rowObj, ['remarks']),
    };

    const parseResult = gtr30EmployeeMasterSchema.safeParse(partialEmployee);
    if (!parseResult.success) {
      result.skippedRows++;
      const errorMessages = parseResult.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
      result.errors.push(`Row ${i + 1}: ${errorMessages}`);
      continue;
    }

    result.employees.push(parseResult.data as GTR30EmployeeMaster);
  }

  return result;
}

export function downloadCsvFile(filename: string, csvContent: string): void {
  const bom = '\uFEFF';
  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}