import type {
  PayBillEmployeeRow,
  PayBillExtractedRecord,
  PayBillDeductionRow,
  PayBillDeductionExtractedRecord,
  MasterEmployeeInfo,
  MappingStatus,
} from '../types';

export function isPlaceholderName(name: string | null | undefined): boolean {
  if (!name) return true;
  const clean = name.trim();
  if (!clean) return true;
  if (/^Employee(?:\s+\d+)?$/i.test(clean)) return true;
  if (/^Staff(?:\s+\d+)?$/i.test(clean)) return true;
  return false;
}

// Known designation tokens seen in Gujarat paybill PDFs. Shared by the PDF
// parser and the report/directory merge layers so a name bundled into the
// designation column is recovered the same way everywhere.
const BUNDLED_DESIGNATION_TOKENS =
  'Live\\s*Stock\\s+Inspector|Veterinary\\s+Officer|Deputy\\s+Director|Assistant\\s+Director|Junior\\s+Clerk|Senior\\s+Clerk|Peon|Driver';

// Trailing fragments that look like grades/scales rather than a person name.
// These must never be promoted into the employee-name section.
const NON_NAME_SUFFIX_PATTERN =
  /^(class|grade|level|group|scale|band|cell|section|division|unit|ward|block|pay|sr|jr|senior|junior)\b/i;

/**
 * Split a designation string that accidentally bundled the employee name.
 * Handles both orders seen in paybill PDFs:
 *  - "Ramesh Patel Live Stock Inspector" -> { name, designation }
 *  - "Live Stock Inspector Sayan" -> { name: "Sayan", designation: "Live Stock Inspector" }
 * Returns null when no split applies.
 */
export function splitBundledNameAndDesignation(
  designation: string | null | undefined
): { name: string; designation: string } | null {
  if (!designation) return null;
  const text = designation.trim();
  if (!text) return null;

  // Case 1: "<Name> <Designation>"
  const nameFirst = text.match(new RegExp(`^(.*?)\\s+(${BUNDLED_DESIGNATION_TOKENS}.*)$`, 'i'));
  if (nameFirst && nameFirst[1].trim().length > 2) {
    return { name: nameFirst[1].trim(), designation: nameFirst[2].trim() };
  }

  // Case 2: "<Designation> <trailing full name>" (e.g. "Junior Clerk Ramesh Patel")
  // A single trailing word (e.g. "Live Stock Inspector Sayan/Ambheti/Vagech") is a posting station,
  // NOT an employee name, and must remain part of the designation.
  const desigFirst = text.match(new RegExp(`^(${BUNDLED_DESIGNATION_TOKENS})\\s*[,\\-–]*\\s+(.+)$`, 'i'));
  if (desigFirst) {
    const trailing = desigFirst[2].trim().replace(/^[(,]+|[),.]+$/g, '').trim();
    const words = trailing.split(/\s+/).filter(Boolean);
    if (
      words.length >= 2 &&
      trailing.length >= 4 &&
      /[A-Za-z]/.test(trailing) &&
      !trailing.startsWith('(') &&
      !NON_NAME_SUFFIX_PATTERN.test(trailing)
    ) {
      return { name: trailing, designation: desigFirst[1].trim() };
    }
  }

  return null;
}


class HrpnMappingService {
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

      let resolvedEmployeeName = row.employeeName;
      let resolvedDesignation = row.designation;

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
        if (matchedEmployee) {
          if (isPlaceholderName(resolvedEmployeeName) && matchedEmployee.name) {
            resolvedEmployeeName = matchedEmployee.name;
          }
          if ((!resolvedDesignation || resolvedDesignation === 'Staff') && matchedEmployee.designation) {
            resolvedDesignation = matchedEmployee.designation;
          }
        }
      } else {
        // Look up in master by HRPN
        matchedEmployee = masterMap.get(hrpn) || null;

        if (matchedEmployee) {
          mappingStatus = 'MATCHED';
          mappingMessage = `Matched with master record: ${matchedEmployee.name}`;

          // Adopt canonical master name if PDF row name was missing or generic placeholder
          if (isPlaceholderName(row.employeeName) && matchedEmployee.name) {
            resolvedEmployeeName = matchedEmployee.name;
            nameMismatch = false;
          } else if (this.isNameMismatch(row.employeeName, matchedEmployee.name)) {
            nameMismatch = true;
            warnings.push(
              `HRPN matched, but employee name differs (PDF: "${row.employeeName}", Master: "${matchedEmployee.name}")`
            );
          }

          if ((!resolvedDesignation || resolvedDesignation === 'Staff') && matchedEmployee.designation) {
            resolvedDesignation = matchedEmployee.designation;
          }
        } else {
          mappingStatus = 'NOT_FOUND';
          mappingMessage = `HRPN ${hrpn} not found in Establishment employee directory (single source of truth)`;
          errors.push(
            `HRPN ${hrpn} not matched with Establishment employee directory — register the employee in Establishment first`
          );
        }
      }

      const normalizedRow: PayBillEmployeeRow = {
        ...row,
        hrpn,
        employeeName: resolvedEmployeeName,
        designation: resolvedDesignation,
      };

      const normalizedString = this.generateNormalizedString(normalizedRow);

      records.push({
        id: `paybill_row_${i + 1}_${hrpn || 'nohrpn'}`,
        row: normalizedRow,
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
   * Mirrors `mapRows` for the deduction side with duplicate, invalid and
   * name-mismatch detection so both sheet types share the same gates.
   */
  mapDeductionRows(
    rows: PayBillDeductionRow[],
    masterEmployees: MasterEmployeeInfo[]
  ): PayBillDeductionExtractedRecord[] {
    const masterMap = this.buildMasterMap(masterEmployees);

    // Count occurrences to detect in-file duplicates (parity with earnings)
    const hrpnOccurrences = new Map<string, number>();
    for (const row of rows) {
      const h = this.normalizeHrpn(row.hrpn);
      if (h) hrpnOccurrences.set(h, (hrpnOccurrences.get(h) || 0) + 1);
    }

    const records: PayBillDeductionExtractedRecord[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const hrpn = this.normalizeHrpn(row.hrpn);
      const errors: string[] = [];
      const warnings: string[] = [];
      let mappingStatus: MappingStatus = 'NOT_FOUND';
      let mappingMessage = '';
      let matchedEmployee: MasterEmployeeInfo | null = null;
      let nameMismatch = false;
      let resolvedEmployeeName = row.employeeName;
      let resolvedDesignation = row.designation;

      if (!hrpn || !this.isValidHrpn(hrpn)) {
        mappingStatus = 'INVALID_HRPN';
        mappingMessage = 'Missing or invalid HRPN format';
        errors.push('Invalid HRPN key');
      } else if ((hrpnOccurrences.get(hrpn) || 0) > 1) {
        mappingStatus = 'DUPLICATE';
        mappingMessage = `Duplicate HRPN ${hrpn} appears multiple times in this bill`;
        errors.push(`HRPN ${hrpn} is duplicated in file`);
        matchedEmployee = masterMap.get(hrpn) || null;
        if (matchedEmployee) {
          if (isPlaceholderName(resolvedEmployeeName) && matchedEmployee.name) {
            resolvedEmployeeName = matchedEmployee.name;
          }
          if ((!resolvedDesignation || resolvedDesignation === 'Staff') && matchedEmployee.designation) {
            resolvedDesignation = matchedEmployee.designation;
          }
        }
      } else {
        matchedEmployee = masterMap.get(hrpn) || null;
        if (matchedEmployee) {
          mappingStatus = 'MATCHED';
          mappingMessage = `Matched with master record: ${matchedEmployee.name}`;

          // Adopt canonical master name if PDF row name was missing or generic placeholder
          if (isPlaceholderName(row.employeeName) && matchedEmployee.name) {
            resolvedEmployeeName = matchedEmployee.name;
            nameMismatch = false;
          } else if (this.isNameMismatch(row.employeeName, matchedEmployee.name)) {
            nameMismatch = true;
            warnings.push(
              `HRPN matched, but employee name differs (PDF: "${row.employeeName}", Master: "${matchedEmployee.name}")`
            );
          }

          if ((!resolvedDesignation || resolvedDesignation === 'Staff') && matchedEmployee.designation) {
            resolvedDesignation = matchedEmployee.designation;
          }
        } else {
          mappingStatus = 'NOT_FOUND';
          mappingMessage = `HRPN ${hrpn} not found in Establishment employee directory (single source of truth)`;
          errors.push(
            `HRPN ${hrpn} not matched with Establishment employee directory — register the employee in Establishment first`
          );
        }
      }

      const normalizedRow: PayBillDeductionRow = {
        ...row,
        hrpn,
        employeeName: resolvedEmployeeName,
        designation: resolvedDesignation,
      };

      records.push({
        id: `ded_rec_${i + 1}_${hrpn || 'nohrpn'}`,
        row: normalizedRow,
        mappingStatus,
        mappingMessage,
        matchedEmployee,
        nameMismatch,
        validationStatus: errors.length > 0 ? 'ERROR' : warnings.length > 0 ? 'WARNING' : 'VALID',
        errors,
        warnings,
        normalizedString: this.generateDeductionNormalizedString(normalizedRow),
      });
    }

    return records;
  }
}

export const hrpnMappingService = new HrpnMappingService();
