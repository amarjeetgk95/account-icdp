import type {
  PayBillEmployeeRow,
  PayBillExtractedRecord,
  PayBillDeductionRow,
  PayBillDeductionExtractedRecord,
  MasterEmployeeInfo,
  MappingStatus,
} from '../types';

export class HrpnMappingService {
  /**
   * Normalize an HRPN string (trims, uppercase, removes invalid characters)
   */
  normalizeHrpn(hrpn: string | undefined | null): string {
    if (!hrpn) return '';
    return String(hrpn).trim().toUpperCase();
  }

  /**
   * Validate HRPN format (numeric or standard alphanumeric 5-12 chars)
   */
  isValidHrpn(hrpn: string): boolean {
    const clean = this.normalizeHrpn(hrpn);
    if (!clean) return false;
    // Standard Gujarat/Indian government HRPN is numeric or alphanumeric 5-12 chars
    return /^[A-Z0-9]{5,12}$/i.test(clean);
  }

  /**
   * Generate canonical derived representation string:
   * HRPN=20014113|NAME=Dr. Hitendrabhai Manilal Patidar|BASIC=117800|DA=84816|HRA=18848|CLA=270|MEDICAL=1000|TRANSPORT=7200|NPP=23560|GROSS=253494
   */
  generateNormalizedString(row: PayBillEmployeeRow): string {
    const hrpn = this.normalizeHrpn(row.hrpn);
    const name = (row.employeeName || '').trim();
    const basic = Math.round(row.basicPay || 0);
    const da = Math.round(row.da || 0);
    const hra = Math.round(row.hra || 0);
    const cla = Math.round(row.cla || 0);
    const medical = Math.round(row.medicalAllowance || 0);
    const transport = Math.round(row.transportAllowance || 0);
    const npp = Math.round(row.nonPrivatePracticeAllowance || 0);
    const gross = Math.round(row.grossAmount || 0);

    const parts = [
      `HRPN=${hrpn}`,
      `NAME=${name}`,
      `BASIC=${basic}`,
      `DA=${da}`,
      `HRA=${hra}`,
      `CLA=${cla}`,
      `MEDICAL=${medical}`,
      `TRANSPORT=${transport}`,
    ];

    if (row.specialPay) parts.push(`SPL_PAY=${Math.round(row.specialPay)}`);
    if (row.washingAllowance) parts.push(`WASH=${Math.round(row.washingAllowance)}`);
    if (npp) parts.push(`NPP=${npp}`);
    parts.push(`GROSS=${gross}`);

    return parts.join('|');
  }

  /**
   * Check if names differ significantly (ignoring titles like Shri, Smt, Dr, whitespace and punctuation)
   */
  isNameMismatch(pdfName: string, masterName: string): boolean {
    if (!pdfName || !masterName) return false;

    const clean = (s: string) =>
      s
        .toLowerCase()
        .replace(/\b(shri|smt|dr|mr|mrs|ms|km|er)\b/g, '')
        .replace(/[^a-z0-9]/g, '')
        .trim();

    const p = clean(pdfName);
    const m = clean(masterName);

    if (!p || !m) return false;
    return p !== m;
  }

  /**
   * Map extracted employee rows against master employee dataset using HRPN
   */
  mapRows(
    rows: PayBillEmployeeRow[],
    masterEmployees: MasterEmployeeInfo[]
  ): PayBillExtractedRecord[] {
    // 1. Build master lookup map by normalized HRPN
    const masterMap = new Map<string, MasterEmployeeInfo>();
    for (const emp of masterEmployees) {
      if (emp.hprnNo) {
        masterMap.set(this.normalizeHrpn(emp.hprnNo), emp);
      }
    }

    // 2. Count occurrences of each HRPN in this batch to detect in-file duplicates
    const hrpnOccurrences = new Map<string, number>();
    for (const row of rows) {
      const h = this.normalizeHrpn(row.hrpn);
      if (h) {
        hrpnOccurrences.set(h, (hrpnOccurrences.get(h) || 0) + 1);
      }
    }

    // 3. Process and map each row
    const records: PayBillExtractedRecord[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const hrpn = this.normalizeHrpn(row.hrpn);
      const errors: string[] = [];
      const warnings: string[] = [];
      let mappingStatus: MappingStatus = 'NOT_FOUND';
      let mappingMessage = '';
      let matchedEmployee: MasterEmployeeInfo | null = null;
      let nameMismatch = false;

      // Check for valid HRPN
      if (!hrpn || !this.isValidHrpn(hrpn)) {
        mappingStatus = 'INVALID_HRPN';
        mappingMessage = 'Missing or invalid HRPN format';
        errors.push('Invalid HRPN key');
      } else if ((hrpnOccurrences.get(hrpn) || 0) > 1) {
        // Duplicate in batch
        mappingStatus = 'DUPLICATE';
        mappingMessage = `Duplicate HRPN ${hrpn} appears multiple times in this bill`;
        errors.push(`HRPN ${hrpn} is duplicated in file`);
        
        // Still check if master exists for reference
        matchedEmployee = masterMap.get(hrpn) || null;
      } else {
        // Look up in master by HRPN
        matchedEmployee = masterMap.get(hrpn) || null;

        if (matchedEmployee) {
          mappingStatus = 'MATCHED';
          mappingMessage = `Matched with master record: ${matchedEmployee.name}`;

          // Check if name differs
          if (this.isNameMismatch(row.employeeName, matchedEmployee.name)) {
            nameMismatch = true;
            warnings.push(
              `HRPN matched, but employee name differs (PDF: "${row.employeeName}", Master: "${matchedEmployee.name}")`
            );
          }
        } else {
          mappingStatus = 'NOT_FOUND';
          mappingMessage = `HRPN ${hrpn} not found in master employee dataset`;
          warnings.push('Employee not registered in master dataset');
        }
      }

      const normalizedString = this.generateNormalizedString(row);

      records.push({
        id: `paybill_row_${i + 1}_${hrpn || 'nohrpn'}`,
        row: {
          ...row,
          hrpn,
        },
        mappingStatus,
        mappingMessage,
        matchedEmployee,
        nameMismatch,
        validationStatus: errors.length > 0 ? 'ERROR' : warnings.length > 0 ? 'WARNING' : 'VALID',
        errors,
        warnings,
        normalizedString,
      });
    }

    return records;
  }

  /**
   * Build master-employee lookup map (shared by earnings + deductions mapping).
   */
  private buildMasterMap(masterEmployees: MasterEmployeeInfo[]): Map<string, MasterEmployeeInfo> {
    const masterMap = new Map<string, MasterEmployeeInfo>();
    for (const emp of masterEmployees) {
      if (emp.hprnNo) {
        masterMap.set(this.normalizeHrpn(emp.hprnNo), emp);
      }
    }
    return masterMap;
  }

  /**
   * Generate canonical derived representation for a deduction row.
   */
  generateDeductionNormalizedString(row: PayBillDeductionRow): string {
    const hrpn = this.normalizeHrpn(row.hrpn);
    const name = (row.employeeName || '').trim();
    return `HRPN=${hrpn}|NAME=${name}|TOTDED=${Math.round(row.totalDeductions || 0)}|NET=${Math.round(
      row.netPay || 0
    )}`;
  }

  /**
   * Map extracted deduction rows against master employee dataset using HRPN.
   * Mirrors `mapRows` for the deduction side.
   */
  mapDeductionRows(
    rows: PayBillDeductionRow[],
    masterEmployees: MasterEmployeeInfo[]
  ): PayBillDeductionExtractedRecord[] {
    const masterMap = this.buildMasterMap(masterEmployees);

    const records: PayBillDeductionExtractedRecord[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const hrpn = this.normalizeHrpn(row.hrpn);
      const matchedEmployee = hrpn ? (masterMap.get(hrpn) || null) : null;
      const mappingStatus: MappingStatus = matchedEmployee ? 'MATCHED' : 'NOT_FOUND';
      const mappingMessage = matchedEmployee
        ? `Matched with master record: ${matchedEmployee.name}`
        : `HRPN ${hrpn || ''} not found in master employee dataset`;

      records.push({
        id: `ded_rec_${i + 1}`,
        row,
        mappingStatus,
        mappingMessage,
        matchedEmployee,
        nameMismatch: false,
        validationStatus: 'VALID',
        errors: [],
        warnings: [],
        normalizedString: this.generateDeductionNormalizedString(row),
      });
    }

    return records;
  }
}

export const hrpnMappingService = new HrpnMappingService();
