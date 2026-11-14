/**
 * scripts/backfill_059.ts
 *
 * One-off backfill migration for 3-track tax reconciliation (Phase 1):
 * 1. Categorize paybill_imports.bill_type from bill_no:
 *    - '%DA%' -> 'DA_ARREAR'
 *    - '%PAY%' / '%ROP%' / '%ARR%' -> 'PAY_ARREAR'
 *    - else -> 'REGULAR'
 *    and propagate bill_type to earnings and deductions.
 * 2. Migrate legacy JSON paybill_settings.manual_values -> paybill_manual_adjustments rows.
 * 3. Backfill employee_salaries.da_diff and pay_diff from historical manual values
 *    so existing reconciled quarters remain 100% MATCHED.
 *
 * Usage:
 *   npx tsx scripts/backfill_059.ts
 *   or
 *   node --loader ts-node/esm scripts/backfill_059.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.VITE_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  '';
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  '';

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Missing Supabase URL or Key in environment.');
  console.error('Ensure VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_ANON_KEY are set.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function classifyBillNo(billNo: string): 'REGULAR' | 'DA_ARREAR' | 'PAY_ARREAR' {
  const norm = (billNo || '').toUpperCase();
  if (norm.includes('DA')) return 'DA_ARREAR';
  if (norm.includes('PAY') || norm.includes('ROP') || norm.includes('ARR')) return 'PAY_ARREAR';
  return 'REGULAR';
}

function normalizeMonth(m: string): string {
  const map: Record<string, string> = {
    jan: 'January', january: 'January',
    feb: 'February', february: 'February',
    mar: 'March', march: 'March',
    apr: 'April', april: 'April',
    may: 'May',
    jun: 'June', june: 'June',
    jul: 'July', july: 'July',
    aug: 'August', august: 'August',
    sep: 'September', sept: 'September', september: 'September',
    oct: 'October', october: 'October',
    nov: 'November', november: 'November',
    dec: 'December', december: 'December',
  };
  return map[m.trim().toLowerCase()] || m.trim();
}

async function runBackfill() {
  console.log('--- Starting 059 3-Track Reconciliation Backfill ---');

  // 1. Backfill paybill_imports.bill_type
  console.log('Step 1: Inspecting paybill_imports...');
  const { data: imports, error: impErr } = await supabase
    .from('paybill_imports')
    .select('id, bill_no, bill_type');

  if (impErr) {
    console.error('Failed to fetch paybill_imports:', impErr);
  } else if (imports) {
    let updatedImports = 0;
    for (const imp of imports) {
      const targetType = classifyBillNo(imp.bill_no);
      if (imp.bill_type !== targetType) {
        const { error: updErr } = await supabase
          .from('paybill_imports')
          .update({ bill_type: targetType })
          .eq('id', imp.id);
        if (!updErr) {
          updatedImports++;
          // Propagate to earnings & deductions
          await supabase
            .from('paybill_employee_earnings')
            .update({ bill_type: targetType })
            .eq('import_id', imp.id);
          await supabase
            .from('paybill_employee_deductions')
            .update({ bill_type: targetType })
            .eq('import_id', imp.id);
        }
      }
    }
    console.log(`Step 1 Complete: Classified ${updatedImports} paybill imports and child rows.`);
  }

  // 2. Migrate legacy JSON manual_values -> paybill_manual_adjustments
  console.log('Step 2: Migrating manual_values JSON to paybill_manual_adjustments table...');
  const { data: settingsData, error: setErr } = await supabase
    .from('paybill_settings')
    .select('settings_value')
    .eq('settings_key', 'manual_values')
    .maybeSingle();

  if (setErr) {
    console.warn('Notice: paybill_settings query notice:', setErr.message);
  }

  type ManualMap = Record<string, Record<string, Record<string, number>>>;
  const manualValues: ManualMap = (settingsData?.settings_value as ManualMap) || {};

  let manualRowsMigrated = 0;
  const salaryDiffUpdates: Array<{ hrpn: string; month: string; daDiff: number; payDiff: number }> = [];

  for (const [hrpn, byLabel] of Object.entries(manualValues)) {
    if (!byLabel || typeof byLabel !== 'object') continue;
    for (const [label, byMonth] of Object.entries(byLabel)) {
      if (!byMonth || typeof byMonth !== 'object') continue;
      const cleanLabel = label.trim();
      const isDa = cleanLabel.toLowerCase().includes('da difference');
      const isPay = cleanLabel.toLowerCase().includes('pay difference');
      if (!isDa && !isPay) continue;

      const paramKey = isDa ? 'DA_DIFFERENCE' : 'PAY_DIFFERENCE';

      for (const [rawMonth, rawAmt] of Object.entries(byMonth)) {
        const amount = Number(rawAmt) || 0;
        if (amount === 0) continue;
        const month = normalizeMonth(rawMonth);
        const fy = 2026; // Default active FY; adjusts per system scope

        const adjRow = {
          hrpn: hrpn.trim(),
          param_key: paramKey,
          param_label: cleanLabel,
          month,
          financial_year: fy,
          amount,
          group_type: 'EARNING',
        };

        const { error: insErr } = await supabase
          .from('paybill_manual_adjustments')
          .upsert(adjRow, { onConflict: 'hrpn,param_key,month,financial_year' });

        if (!insErr) {
          manualRowsMigrated++;
        }

        salaryDiffUpdates.push({
          hrpn: hrpn.trim(),
          month,
          daDiff: isDa ? amount : 0,
          payDiff: isPay ? amount : 0,
        });
      }
    }
  }
  console.log(`Step 2 Complete: Migrated ${manualRowsMigrated} manual adjustments to rows.`);

  // 3. Backfill employee_salaries diff columns for historical parity
  console.log('Step 3: Checking employee_salaries historical parity...');
  if (salaryDiffUpdates.length > 0) {
    // Resolve employee_id from HRPN
    const { data: employees } = await supabase
      .from('employees')
      .select('id, hprn_no');
    const { data: estEmployees } = await supabase
      .from('establishment_employees')
      .select('id, hrpn_no');

    const empIdByHrpn = new Map<string, string>();
    for (const e of employees || []) {
      if (e.hprn_no) empIdByHrpn.set(e.hprn_no.trim().toLowerCase(), String(e.id));
    }
    for (const e of estEmployees || []) {
      if (e.hrpn_no && !empIdByHrpn.has(e.hrpn_no.trim().toLowerCase())) {
        empIdByHrpn.set(e.hrpn_no.trim().toLowerCase(), String(e.id));
      }
    }

    let salariesBackfilled = 0;
    for (const upd of salaryDiffUpdates) {
      const empId = empIdByHrpn.get(upd.hrpn.toLowerCase());
      if (!empId) continue;

      // Check if employee_salaries has this entry
      const { data: existingSal } = await supabase
        .from('employee_salaries')
        .select('gross, da, pay_diff, da_diff')
        .eq('employee_id', empId)
        .eq('month', upd.month)
        .maybeSingle();

      if (existingSal) {
        // If diffs are currently 0, populate them so PR Regular matches PB Regular
        if ((existingSal.da_diff === 0 && upd.daDiff > 0) || (existingSal.pay_diff === 0 && upd.payDiff > 0)) {
          const { error: salUpdErr } = await supabase
            .from('employee_salaries')
            .update({
              da_diff: upd.daDiff > 0 ? upd.daDiff : existingSal.da_diff,
              pay_diff: upd.payDiff > 0 ? upd.payDiff : existingSal.pay_diff,
            })
            .eq('employee_id', empId)
            .eq('month', upd.month);

          if (!salUpdErr) {
            salariesBackfilled++;
          }
        }
      }
    }
    console.log(`Step 3 Complete: Backfilled arrears diffs on ${salariesBackfilled} historical salary records.`);
  } else {
    console.log('Step 3 Complete: No historical manual arrears diffs to backfill.');
  }

  console.log('--- 059 Backfill Complete Successfully ---');
}

runBackfill().catch((err) => {
  console.error('Backfill failed with error:', err);
  process.exit(1);
});
