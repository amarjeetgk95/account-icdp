import type { GTR30EmployeeMaster } from '../types';

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
      cadreClass: '૩',
      payScale: '34,500-1,12,400',
      gradePay: 'GP:4200',
      payLevelCell: 'PAY=39900 (LEVEL CELL-7)',
      ppaNo: 'Applied',
      currentPay: 39900,
      currentPayDate: '2026-07-01',
      quarterAddress: 'H-7, Government Quarters, Khatodara, Surat',
      insuranceGroup: 'ખ',
      insuranceType: 'savings_and_insurance',
      hraPercent: 0,
      da: 21147,
      transportAllowance: 3600,
      medicalAllowance: 1000,
      claAllowance: 270,
      rentOfBuilding: 300,
      professionalTax: 200,
      gis1981Insurance: 240,
      gis1981Savings: 560,
      npsPension: 6105,
      societyDeduction: 4154,
      remarks: '',
    },
  ];

  return exportMasterToCsv(sampleRows as GTR30EmployeeMaster[]);
}

export function parseCsvLine(text: string): string[] {
  const result: string[] = [];
  let curr = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (i + 1 < text.length && text[i + 1] === '"') {
          curr += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        curr += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === ',') {
        result.push(curr.trim());
        curr = '';
      } else {
        curr += c;
      }
    }
  }
  result.push(curr.trim());
  return result;
}

export function importMasterFromCsv(csvText: string): Partial<GTR30EmployeeMaster>[] {
  const lines = csvText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length <= 1) return [];

  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
  const employees: Partial<GTR30EmployeeMaster>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    if (cols.length === 0 || !cols.some(Boolean)) continue;

    const rowObj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      if (idx < cols.length) {
        rowObj[h] = cols[idx];
      }
    });

    const name = rowObj['employeename'] || rowObj['name'] || '';
    if (!name || name.length < 2) continue;

    const currentPay = Number(rowObj['currentpay'] || rowObj['basicpay'] || 0) || 0;
    const da = rowObj['da'] ? Number(rowObj['da']) : Math.round(currentPay * 0.53);
    const nps = rowObj['npspension'] ? Number(rowObj['npspension']) : Math.round((currentPay + da) * 0.1);

    employees.push({
      srNo: Number(rowObj['srno']) || i,
      hrpnNo: rowObj['hrpnno'] || rowObj['hrpn'] || undefined,
      name,
      designation: rowObj['designation'] || '',
      designationGujarati: rowObj['designationgujarati'] || '',
      cadreClass: rowObj['cadreclass'] || '૩',
      payScale: rowObj['payscale'] || '34,500-1,12,400',
      gradePay: rowObj['gradepay'] || 'GP:4200',
      payLevelCell: rowObj['paylevelcell'] || (currentPay > 0 ? `PAY=${currentPay} (LEVEL CELL-7)` : ''),
      ppaNo: rowObj['ppano'] || 'Applied',
      currentPay,
      currentPayDate: rowObj['payincrementdate'] || rowObj['currentpaydate'] || '',
      quarterAddress: rowObj['quarteraddress'] || '',
      insuranceGroup: rowObj['insurancegroup'] || 'ખ',
      insuranceType: (rowObj['insurancetype'] === 'insurance_only' ? 'insurance_only' : 'savings_and_insurance'),
      hraPercent: Number(rowObj['hrapercent']) || 0,
      da,
      transportAllowance: Number(rowObj['transportallowance']) || 0,
      medicalAllowance: Number(rowObj['medicalallowance']) || 0,
      claAllowance: Number(rowObj['claallowance']) || 0,
      rentOfBuilding: Number(rowObj['rentofbuilding']) || 0,
      professionalTax: Number(rowObj['professionaltax']) || 0,
      gis1981Insurance: Number(rowObj['gisinsurancefund'] || rowObj['gis1981insurance']) || 0,
      gis1981Savings: Number(rowObj['gissavingsfund'] || rowObj['gis1981savings']) || 0,
      npsPension: nps,
      societyDeduction: Number(rowObj['societydeduction']) || 0,
      remarks: rowObj['remarks'] || '',
    });
  }

  return employees;
}

export function downloadCsvFile(filename: string, csvContent: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
