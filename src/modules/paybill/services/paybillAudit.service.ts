import type {
  PayBillParsedResult,
  PayBillExtractedRecord,
  PayBillAuditReport,
  PayBillAuditAnomaly,
  PayBillAuditConfig,
} from '../types';

class PayBillAuditService {
  /**
   * Run smart audit on parsed paybill records
   */
  auditPayBill(
    parsedResult: PayBillParsedResult,
    records: PayBillExtractedRecord[] = [],
    config: PayBillAuditConfig = {}
  ): PayBillAuditReport {
    const anomalies: PayBillAuditAnomaly[] = [];
    const {
      daRates,
      daHikeThreshold = 50,
      basicPayChangeTolerance = 10,
      previousDaPercentage,
      previousMonthRecords = [],
    } = config;

    // 1. Compute overall DA Percentage for this bill
    let totalBasic = 0;
    let totalDA = 0;

    for (const row of parsedResult.rows) {
      totalBasic += row.basicPay || 0;
      totalDA += row.da || 0;
    }

    const daPercentage =
      totalBasic > 0 ? Math.round((totalDA / totalBasic) * 10000) / 100 : 0;

    // Detect if DA rate is unusual or represents a recent hike
    // (threshold configurable via office settings; standard rates historically 50%, 53%, 46%, 42%, 38%)
    const isDaHiked = daPercentage >= daHikeThreshold;

    // DA rate not among the rates configured for the current financial year
    if (daPercentage > 0 && Array.isArray(daRates) && daRates.length > 0) {
      const recognized = daRates.some((r) => Math.abs(r - daPercentage) <= 0.5);
      if (!recognized) {
        anomalies.push({
          id: 'da-rate-unusual',
          hrpn: '',
          employeeName: '',
          type: 'DA_HIKE',
          severity: 'INFO',
          title: 'Unrecognized DA Rate',
          description: `Bill DA rate ${daPercentage}% is not among the configured rates for this financial year (${daRates.join(', ')}%).`,
          oldValue: daRates.join(', '),
          newValue: `${daPercentage}%`,
        });
      }
    }

    // DA rate change vs previous month (month-to-month anomaly)
    if (previousDaPercentage != null && daPercentage > 0 && Math.abs(previousDaPercentage - daPercentage) >= 1) {
      anomalies.push({
        id: 'da-rate-change',
        hrpn: '',
        employeeName: '',
        type: 'DA_HIKE',
        severity: 'WARNING',
        title: 'DA Rate Changed vs Previous Month',
        description: `Bill DA rate moved from ${previousDaPercentage}% (previous month) to ${daPercentage}%.`,
        oldValue: `${previousDaPercentage}%`,
        newValue: `${daPercentage}%`,
      });
    }

    let incrementCount = 0;

    // 2. Audit each record against matched master data
    for (const record of records) {
      const row = record.row;
      const master = record.matchedEmployee;

      // Anomaly: Unmapped Employee
      if (record.mappingStatus === 'NOT_FOUND' || !master) {
        anomalies.push({
          id: `unmapped-${row.hrpn}`,
          hrpn: row.hrpn,
          employeeName: row.employeeName,
          type: 'NEW_EMPLOYEE',
          severity: 'WARNING',
          title: 'Unmapped Employee',
          description: `HRPN ${row.hrpn} is not registered in Master Employees. Click 'Quick-Add' to register.`,
        });
        continue;
      }

      // Anomaly: Name Mismatch between PDF and Master
      if (record.nameMismatch) {
        anomalies.push({
          id: `name-diff-${row.hrpn}`,
          hrpn: row.hrpn,
          employeeName: row.employeeName,
          type: 'OUTLIER_ALLOWANCE',
          severity: 'INFO',
          title: 'Name Variation',
          description: `PDF name "${row.employeeName}" differs from Master name "${master.name}".`,
          oldValue: master.name,
          newValue: row.employeeName,
        });
      }

      // Check for designation discrepancy
      if (master.designation && row.designation) {
        const cleanMasterDesig = master.designation.toLowerCase().replace(/[^a-z]/g, '');
        const cleanRowDesig = row.designation.toLowerCase().replace(/[^a-z]/g, '');
        if (cleanMasterDesig && cleanRowDesig && !cleanMasterDesig.includes(cleanRowDesig) && !cleanRowDesig.includes(cleanMasterDesig)) {
          anomalies.push({
            id: `desig-change-${row.hrpn}`,
            hrpn: row.hrpn,
            employeeName: row.employeeName,
            type: 'PROMOTION',
            severity: 'INFO',
            title: 'Designation / Cadre Update',
            description: `Designation in PDF (${row.designation}) differs from Master record (${master.designation}).`,
            oldValue: master.designation,
            newValue: row.designation,
          });
        }
      }

      // Check allowance ratio consistency
      if (row.basicPay > 0) {
        const empDaPercent = Math.round((row.da / row.basicPay) * 100);
        if (Math.abs(empDaPercent - daPercentage) > 2 && row.da > 0) {
          anomalies.push({
            id: `da-ratio-${row.hrpn}`,
            hrpn: row.hrpn,
            employeeName: row.employeeName,
            type: 'OUTLIER_ALLOWANCE',
            severity: 'WARNING',
            title: 'DA Rate Deviation',
            description: `DA rate (${empDaPercent}%) differs from the bill average (${daPercentage}%).`,
            oldValue: `${daPercentage}%`,
            newValue: `${empDaPercent}%`,
          });
        }
      }

      // Check basic pay change vs previous month (month-to-month anomaly)
      const prev = previousMonthRecords.find((p) => p.hrpn === row.hrpn);
      if (prev && prev.basicPay > 0 && row.basicPay > 0) {
        const deltaPct = Math.round(((row.basicPay - prev.basicPay) / prev.basicPay) * 100);
        if (Math.abs(deltaPct) > basicPayChangeTolerance) {
          incrementCount += 1;
          anomalies.push({
            id: `basic-change-${row.hrpn}`,
            hrpn: row.hrpn,
            employeeName: row.employeeName,
            type: 'BASIC_INCREMENT',
            severity: 'WARNING',
            title: 'Basic Pay Change vs Previous Month',
            description: `Basic Pay changed ${deltaPct > 0 ? '+' : ''}${deltaPct}% vs ${prev.month} (${prev.basicPay.toFixed(2)} -> ${row.basicPay.toFixed(2)}).`,
            oldValue: prev.basicPay,
            newValue: row.basicPay,
          });
        }
      }
    }

    const healthyRecordCount = records.length - anomalies.filter((a) => a.severity !== 'INFO').length;

    return {
      month: parsedResult.metadata.month || 'Unknown Month',
      daPercentage,
      previousDaPercentage,
      isDaHiked,
      incrementCount,
      anomalies,
      healthyRecordCount: Math.max(0, healthyRecordCount),
    };
  }
}

export const paybillAuditService = new PayBillAuditService();
