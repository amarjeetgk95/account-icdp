import type { GTR30FormData } from '../types';
import { billTotals, deductionsTotal, earningsTotal } from '../services/gtr30Calc.service';

/**
 * Cross-page validation for GTR-30.
 * P3 Gross (col16) must equal sum earningsTotal per employee.
 * P4 Total Deductions (col36) must equal sum deductionsTotal.
 * P5 Rent schedule total must equal sum rentOfBuilding where >0.
 * P6 Prof Tax total must equal sum professionalTax where >0.
 * P7/P8 GIS totals must reconcile.
 * Returns warnings that can be shown in CreatePage split-view or before save.
 */
export interface GTR30ValidationWarning {
  field: string;
  message: string;
  severity: 'error' | 'warning';
  page: string;
}

export function validateGTR30CrossPages(data: GTR30FormData): GTR30ValidationWarning[] {
  const warnings: GTR30ValidationWarning[] = [];
  const employees = data.employees || [];
  const totals = billTotals(data);

  // P3/P4 vs billTotals consistency
  const sumGross = employees.reduce((s, e) => s + earningsTotal(e), 0);
  const sumDed = employees.reduce((s, e) => s + deductionsTotal(e), 0);
  if (Math.abs(sumGross - totals.gross) > 0.01) {
    warnings.push({ field: 'gross', message: `P3 Gross total mismatch: calc ${sumGross} vs billTotals ${totals.gross}`, severity: 'error', page: 'P3' });
  }
  if (Math.abs(sumDed - totals.deductions) > 0.01) {
    warnings.push({ field: 'deductions', message: `P4 Deductions mismatch: calc ${sumDed} vs billTotals ${totals.deductions}`, severity: 'error', page: 'P4' });
  }

  // Rent schedule: P5 filters rent>0
  const rentOnly = employees.filter((e) => (e.rentOfBuilding || 0) > 0);
  const rentInSchedule = rentOnly.reduce((s, e) => s + (e.rentOfBuilding || 0), 0);
  if (Math.abs(rentInSchedule - totals.totalRent) > 0.01) {
    warnings.push({ field: 'rentOfBuilding', message: `P5 Rent schedule ${rentInSchedule} differs from P4 col22 total ${totals.totalRent}`, severity: 'warning', page: 'P5' });
  }
  if (rentOnly.some((e) => !e.quarterAddress || !e.quarterAddress.trim())) {
    warnings.push({ field: 'quarterAddress', message: 'Rent deducted but Quarter Address missing — P5 will show placeholder', severity: 'warning', page: 'P5' });
  }

  // Prof Tax schedule: gross <12k should be 0
  for (const e of employees) {
    const gross = earningsTotal(e);
    const pt = e.professionalTax || 0;
    if (gross < 12000 && pt !== 0) {
      warnings.push({ field: `professionalTax:${e.id}`, message: `${e.name}: gross ₹${gross} < 12k but PT ₹${pt} charged (slab 0)`, severity: 'warning', page: 'P6' });
    }
    if (gross >= 12000 && pt === 0) {
      warnings.push({ field: `professionalTax:${e.id}`, message: `${e.name}: gross ₹${gross} >= 12k but PT 0 (expected 200)`, severity: 'warning', page: 'P6' });
    }
  }

  // GIS: insuranceGroup must be one of ક/ખ/ગ/ઘ or A-D
  const validGroups = new Set(['ક', 'ખ', 'ગ', 'ઘ', 'A', 'B', 'C', 'D']);
  for (const e of employees) {
    const hasGIS = (e.gis1981Insurance || 0) > 0 || (e.gis1981Savings || 0) > 0;
    if (hasGIS && e.insuranceGroup && !validGroups.has(e.insuranceGroup.trim().toUpperCase()) && !validGroups.has(e.insuranceGroup.trim())) {
      warnings.push({ field: `insuranceGroup:${e.id}`, message: `${e.name}: GIS deducted but group "${e.insuranceGroup}" invalid (use ક/ખ/ગ/ઘ)`, severity: 'warning', page: 'P7' });
    }
  }

  // HRA: if HRA>0 but payOfEstablishment 0
  for (const e of employees) {
    if ((e.hra || 0) > 0 && (e.payOfEstablishment || 0) === 0 && (e.payOfOfficer || 0) === 0) {
      warnings.push({ field: `hra:${e.id}`, message: `${e.name}: HRA ₹${e.hra} but Basic Pay 0`, severity: 'warning', page: 'P3' });
    }
  }

  // Header: district must be numeric if provided
  if (data.district && !/^\d+$/.test(data.district.trim())) {
    warnings.push({ field: 'district', message: 'District code should be numeric', severity: 'error', page: 'P1' });
  }
  // Cardex/DDO required
  if (!data.cardexNo?.trim()) warnings.push({ field: 'cardexNo', message: 'Cardex No required for P1/P2/P5-P10 signatures', severity: 'error', page: 'P1' });
  if (!data.ddoCode?.trim()) warnings.push({ field: 'ddoCode', message: 'DDO Code required for P1/P2 signatures', severity: 'error', page: 'P1' });
  if (!data.monthOf?.trim()) warnings.push({ field: 'monthOf', message: 'Month of Bill required — drives DA rate & P10 dates', severity: 'error', page: 'P1' });

  // P10: monthOf must parse
  if (data.monthOf && !/^([A-Za-z]+)-(\d{4})$/.test(data.monthOf.trim())) {
    warnings.push({ field: 'monthOf', message: `Month "${data.monthOf}" not in "Month-YYYY" (e.g. December-2024) — P10 Gujarati dates fallback`, severity: 'warning', page: 'P10' });
  }

  return warnings;
}

export function hasBlockingErrors(warnings: GTR30ValidationWarning[]): boolean {
  return warnings.some((w) => w.severity === 'error');
}
