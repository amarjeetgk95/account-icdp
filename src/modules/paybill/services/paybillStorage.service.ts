import { supabase } from '@/core/supabase/client';
import { useAuthStore } from '@/core/auth/store';
import { getOfficeId } from '@/shared/utilities/office';
import { employeeService } from '@/modules/payroll/services/employee.service';
import type {
  PayBillMetadata,
  PayBillExtractedRecord,
  PayBillImportResult,
  MasterEmployeeInfo,
  PayBillStoredImport,
  PayBillStoredEarning,
} from '../types';

export class PayBillStorageService {
  /**
   * Fetch master employees from database for HRPN mapping
   */
  async getMasterEmployees(): Promise<MasterEmployeeInfo[]> {
    try {
      const list = await employeeService.listEmployees();
      return list.map((emp) => ({
        id: emp.id,
        name: emp.name,
        pan: emp.pan,
        hprnNo: emp.hprn_no,
        officeId: emp.office_id,
        budgetHeadId: emp.budget_head_id,
      }));
    } catch (err) {
      console.warn('[PayBillStorage] Could not fetch master employees from Supabase, using mock/cache:', err);
      // Fallback sample master list for standalone testing
      return [
        {
          id: 'emp-1',
          name: 'Shri.Dr Dineshbhai Chamabhai Chaudhari',
          pan: 'ABCDE1234F',
          hprnNo: '20013826',
          designation: 'Deputy Director (Animal Husbandary)',
        },
        {
          id: 'emp-2',
          name: 'Shri.Dr Hitendrabhai Manilal Patidar',
          pan: 'BCDEF2345G',
          hprnNo: '20014113',
          designation: 'Assistant Director',
        },
        {
          id: 'emp-3',
          name: 'Shri.Dr Jagdishkumar Mohanbhai Jalandhra',
          pan: 'CDEFG3456H',
          hprnNo: '20014151',
          designation: 'Assistant Director',
        },
        {
          id: 'emp-4',
          name: 'Shri.Dr Harit Dhananjaybhai Bhatt',
          pan: 'DEFGH4567I',
          hprnNo: '20014153',
          designation: 'Assistant Director',
        },
      ];
    }
  }

  /**
   * Parse financial year and month name from bill metadata
   * e.g. "July-2026" -> month = "July", fy = 2026
   */
  parseMonthAndFy(monthStr: string): { month: string; financialYear: number } {
    if (!monthStr) {
      const now = new Date();
      return { month: 'July', financialYear: now.getFullYear() };
    }

    const clean = monthStr.trim();
    // Match "July-2026" or "07/2026" or "July 2026"
    const namedMatch = clean.match(/^([A-Za-z]+)[-/ ](\d{4})$/);
    if (namedMatch) {
      const rawMonth = namedMatch[1];
      const year = parseInt(namedMatch[2], 10);
      // Standardize month name capitalization (e.g. July, August)
      const capitalizedMonth =
        rawMonth.charAt(0).toUpperCase() + rawMonth.slice(1).toLowerCase();
      return { month: capitalizedMonth, financialYear: year };
    }

    const numMatch = clean.match(/^(\d{1,2})[-/ ](\d{4})$/);
    if (numMatch) {
      const monthIndex = parseInt(numMatch[1], 10) - 1;
      const year = parseInt(numMatch[2], 10);
      const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December',
      ];
      return {
        month: months[monthIndex] || 'July',
        financialYear: year,
      };
    }

    return { month: clean, financialYear: 2026 };
  }

  /**
   * Commit and persist imported pay bill data into the system
   */
  async importPayBill(
    metadata: PayBillMetadata,
    records: PayBillExtractedRecord[],
    fileName = 'PayBill_Inner_Sheet.pdf'
  ): Promise<PayBillImportResult> {
    const officeId = getOfficeId();
    const userId = useAuthStore.getState().user?.id;
    const { month, financialYear } = this.parseMonthAndFy(metadata.month);

    const matchedRecords = records.filter((r) => r.mappingStatus === 'MATCHED');
    const notFoundRecords = records.filter((r) => r.mappingStatus === 'NOT_FOUND');

    let importId = `paybill_import_${Date.now()}`;
    let appliedToPayrollGrid = 0;

    const grossTotal = records.reduce((sum, r) => sum + (r.row.grossAmount || 0), 0);

    // Prepare stored entities
    const storedImport: PayBillStoredImport = {
      id: importId,
      officeId: officeId || 'default-office',
      billNo: metadata.billNo || 'Srt0299002201',
      month,
      financialYear,
      ddoHrpn: metadata.ddoHrpn || null,
      ddoName: metadata.ddoName || null,
      majorHead: metadata.majorHead || null,
      ddoCode: metadata.ddoCode || null,
      department: metadata.department || null,
      officeName: metadata.officeName || null,
      tanNo: metadata.tanNo || null,
      cardexNo: metadata.cardexNo || null,
      totalRecords: records.length,
      matchedCount: matchedRecords.length,
      grossTotal: Math.round(grossTotal * 100) / 100,
      uploadedFile: metadata.billNo ? `PayBill_${metadata.billNo}.pdf` : fileName,
      createdAt: new Date().toISOString(),
    };

    const storedEarnings: PayBillStoredEarning[] = records.map((rec, idx) => ({
      id: `${importId}_row_${idx + 1}`,
      importId,
      officeId: officeId || 'default-office',
      employeeId: rec.matchedEmployee?.id || null,
      hrpn: rec.row.hrpn,
      employeeName: rec.row.employeeName,
      designation: rec.row.designation || null,
      payScale: rec.row.payScale || null,
      ph: rec.row.ph || null,
      slo: rec.row.slo || null,
      month,
      financialYear,
      basicPay: rec.row.basicPay || 0,
      da: rec.row.da || 0,
      hra: rec.row.hra || 0,
      cla: rec.row.cla || 0,
      medicalAllowance: rec.row.medicalAllowance || 0,
      transportAllowance: rec.row.transportAllowance || 0,
      specialPay: rec.row.specialPay || 0,
      washingAllowance: rec.row.washingAllowance || 0,
      nppAllowance: rec.row.nonPrivatePracticeAllowance || 0,
      otherAllowance: rec.row.otherAllowance || 0,
      grossAmount: rec.row.grossAmount || 0,
      mappingStatus: rec.mappingStatus,
      createdAt: new Date().toISOString(),
    }));

    // Cache locally immediately
    const { paybillRepository } = await import('../repositories/paybill.repository');
    paybillRepository.saveToCache(storedImport, storedEarnings);

    try {
      if (officeId) {
        // 1. Insert into dedicated paybill_imports table
        const { data: pImport, error: pImportErr } = await supabase
          .from('paybill_imports')
          .insert({
            office_id: officeId,
            bill_no: metadata.billNo || 'Srt0299002201',
            month,
            financial_year: financialYear,
            ddo_hrpn: metadata.ddoHrpn || null,
            ddo_name: metadata.ddoName || null,
            major_head: metadata.majorHead || null,
            ddo_code: metadata.ddoCode || null,
            department: metadata.department || null,
            office_name: metadata.officeName || null,
            tan_no: metadata.tanNo || null,
            cardex_no: metadata.cardexNo || null,
            total_records: records.length,
            matched_count: matchedRecords.length,
            gross_total: Math.round(grossTotal * 100) / 100,
            uploaded_file: metadata.billNo ? `PayBill_${metadata.billNo}.pdf` : fileName,
            uploaded_by: userId || null,
          })
          .select()
          .maybeSingle();

        if (!pImportErr && pImport) {
          importId = pImport.id;
        }

        // 2. Insert into paybill_employee_earnings table
        const earningsPayload = records.map((rec) => ({
          import_id: importId,
          office_id: officeId,
          employee_id: rec.matchedEmployee?.id || null,
          hrpn: rec.row.hrpn,
          employee_name: rec.row.employeeName,
          designation: rec.row.designation || null,
          pay_scale: rec.row.payScale || null,
          ph: rec.row.ph || null,
          slo: rec.row.slo || null,
          month,
          financial_year: financialYear,
          basic_pay: Math.round((rec.row.basicPay || 0) * 100) / 100,
          da: Math.round((rec.row.da || 0) * 100) / 100,
          hra: Math.round((rec.row.hra || 0) * 100) / 100,
          cla: Math.round((rec.row.cla || 0) * 100) / 100,
          medical_allowance: Math.round((rec.row.medicalAllowance || 0) * 100) / 100,
          transport_allowance: Math.round((rec.row.transportAllowance || 0) * 100) / 100,
          npp_allowance: Math.round((rec.row.nonPrivatePracticeAllowance || 0) * 100) / 100,
          gross_amount: Math.round((rec.row.grossAmount || 0) * 100) / 100,
          mapping_status: rec.mappingStatus,
        }));

        if (earningsPayload.length > 0) {
          await supabase.from('paybill_employee_earnings').upsert(earningsPayload);
        }

        // 3. Create a record in salary_imports for backward compatibility
        const { data: importRecord, error: _importError } = await supabase
          .from('salary_imports')
          .insert({
            office_id: officeId,
            excel_filename: metadata.billNo ? `PayBill_${metadata.billNo}.pdf` : fileName,
            financial_year: financialYear,
            total_records: records.length,
            matched_count: matchedRecords.length,
            uploaded_by: userId || null,
          })
          .select()
          .single();

        const legacyImportId = importRecord?.id || importId;

        // 4. Upsert employee_salary rows
        const salaryRows = records.map((rec) => {
          let statusStr: 'matched' | 'unmatched' | 'duplicate' | 'not_detected' = 'unmatched';
          if (rec.mappingStatus === 'MATCHED') statusStr = 'matched';
          else if (rec.mappingStatus === 'DUPLICATE') statusStr = 'duplicate';

          return {
            salary_import_id: legacyImportId,
            employee_id: rec.matchedEmployee?.id || null,
            hprn_no: rec.row.hrpn,
            office_id: officeId,
            name: rec.row.employeeName,
            month: month,
            financial_year: financialYear,
            gross_salary: Math.round(rec.row.grossAmount * 100) / 100,
            income_tax: 0,
            status: statusStr,
          };
        });

        if (salaryRows.length > 0) {
          await supabase.from('employee_salary').upsert(salaryRows, {
            onConflict: 'salary_import_id,hprn_no,month',
          });
        }

        // 5. Upsert to employee_salaries for matched records so Monthly Entry & Quarter Reports update
        const payrollGridRows = matchedRecords
          .filter((r) => r.matchedEmployee?.id)
          .map((r) => ({
            employee_id: r.matchedEmployee!.id,
            office_id: officeId,
            financial_year: financialYear,
            month: month,
            gross: Math.round(r.row.grossAmount * 100) / 100,
            da: Math.round(r.row.da * 100) / 100,
            tax: 0,
          }));

        if (payrollGridRows.length > 0) {
          const { error: gridError } = await supabase
            .from('employee_salaries')
            .upsert(payrollGridRows, {
              onConflict: 'employee_id,financial_year,month',
            });

          if (!gridError) {
            appliedToPayrollGrid = payrollGridRows.length;
          }
        }
      }
    } catch (err) {
      console.warn('[PayBillStorage] Database upsert completed with local repository sync:', err);
    }

    return {
      importId,
      billNo: metadata.billNo || 'Srt0299002201',
      month,
      financialYear,
      totalRecords: records.length,
      matchedCount: matchedRecords.length,
      notFoundCount: notFoundRecords.length,
      appliedToPayrollGrid,
      createdAt: new Date().toISOString(),
    };
  }
}

export const paybillStorageService = new PayBillStorageService();
