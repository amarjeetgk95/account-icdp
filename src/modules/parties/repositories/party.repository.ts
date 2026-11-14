import { supabase } from '@/core/supabase/client';
import type { Party, PartyTransaction, TransactionInput, GSTReport, IncomeTaxReport } from '../types';
import type { Database } from '@/shared/database.types';

function money(value: number): number {
  return Math.round(value * 100) / 100;
}

const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/;
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function fyBounds(fy: number): { from: string; to: string } {
  return { from: `${fy}-04-01`, to: `${fy + 1}-04-01` };
}

/** Quarter -> inclusive [from, to) date range as YYYY-MM-DD strings (no TZ shift). */
function quarterBounds(fy: number, quarter: string): { from: string; to: string } | null {
  switch (quarter) {
    case 'Q1':
      return { from: `${fy}-04-01`, to: `${fy}-07-01` };
    case 'Q2':
      return { from: `${fy}-07-01`, to: `${fy}-10-01` };
    case 'Q3':
      return { from: `${fy}-10-01`, to: `${fy + 1}-01-01` };
    case 'Q4':
      return { from: `${fy + 1}-01-01`, to: `${fy + 1}-04-01` };
    default:
      return null;
  }
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === '23505'
  );
}

function isValidDateString(s: string): boolean {
  if (!DATE_RE.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  if (m < 1 || m > 12 || d < 1) return false;
  return d <= new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export const partyRepository = {
  async listParties(): Promise<Party[]> {
    const { data, error } = await supabase
      .from('parties')
      .select('id, name, gst_no, pan_no')
      .order('name');

    if (error) throw error;
    return data || [];
  },

  async listTransactions(fy?: number): Promise<PartyTransaction[]> {
    let query = supabase
      .from('party_transactions')
      .select('id, ddo_bill_no, bill_no, invoice_date, settlement_date, transaction_date, amount, cgst, sgst, igst, total_gst, income_tax, parties(id, name)')
      .order('transaction_date', { ascending: false })
      .order('id', { ascending: false });

    if (fy !== undefined) {
      const { from, to } = fyBounds(fy);
      query = query.gte('transaction_date', from).lt('transaction_date', to);
    }

    const { data, error } = await query;

    if (error) throw error;

    type PartyTxJoined = {
      id: string;
      ddo_bill_no: string | null;
      bill_no: string;
      invoice_date: string | null;
      settlement_date: string | null;
      transaction_date: string;
      amount: number;
      cgst: number;
      sgst: number;
      igst: number;
      total_gst: number;
      income_tax: number;
      parties: { id: string; name: string } | null;
    };

    return ((data || []) as unknown as PartyTxJoined[]).map((tx) => ({
      id: tx.id,
      party_id: tx.parties?.id || '',
      party_name: tx.parties?.name || 'Unknown',
      ddo_bill_no: tx.ddo_bill_no || null,
      bill_no: tx.bill_no,
      invoice_date: tx.invoice_date || tx.transaction_date,
      settlement_date: tx.settlement_date || tx.transaction_date,
      transaction_date: tx.settlement_date || tx.transaction_date,
      amount: tx.amount,
      cgst: tx.cgst,
      sgst: tx.sgst,
      igst: tx.igst,
      total_gst: tx.total_gst,
      income_tax: tx.income_tax,
    }));
  },

  async saveTransaction(input: TransactionInput): Promise<string> {
    const partyName = input.partyName?.trim();
    const billNo = input.billNo?.trim();
    const ddoBillNo = input.ddoBillNo?.trim() || null;
    const settlementDate = input.settlementDate?.trim() || input.date?.trim() || '';
    const invoiceDate = input.invoiceDate?.trim() || settlementDate;

    if (!partyName) throw new Error('Party Name is required');
    if (!billNo) throw new Error('Bill No is required');
    if (!settlementDate) throw new Error('Settlement Date is required');
    if (!isValidDateString(settlementDate)) throw new Error('Invalid Settlement Date (expected YYYY-MM-DD)');
    if (invoiceDate && !isValidDateString(invoiceDate)) throw new Error('Invalid Invoice Date (expected YYYY-MM-DD)');
    if (!(input.amount > 0)) throw new Error('Amount must be greater than 0');
    if ((input.cgst || 0) < 0 || (input.sgst || 0) < 0 || (input.igst || 0) < 0) {
      throw new Error('GST amounts cannot be negative');
    }
    if ((input.incomeTax || 0) < 0) throw new Error('Income tax cannot be negative');

    const gstNo = input.gstNo?.trim().toUpperCase() || '';
    const panNo = input.panNo?.trim().toUpperCase() || '';

    if (gstNo && !GST_REGEX.test(gstNo)) throw new Error('Invalid GST No format');
    if (panNo && !PAN_REGEX.test(panNo)) throw new Error('Invalid PAN No format');

    const cgst = money(input.cgst || 0);
    const sgst = money(input.sgst || 0);
    const igst = money(input.igst || 0);
    const incomeTax = money(input.incomeTax || 0);
    const totalGst = money(cgst + sgst + igst);

    const { data: parties } = await supabase
      .from('parties')
      .select('id, name, gst_no, pan_no');

    const targetName = partyName.toUpperCase();
    let party = (parties || []).find(
      (p) => p.name.trim().toUpperCase() === targetName
    );

    if (!party) {
      const { data: inserted, error: insertErr } = await supabase
        .from('parties')
        .insert({
          name: partyName,
          gst_no: gstNo || null,
          pan_no: panNo || null,
        })
        .select()
        .single();
      if (insertErr) {
        // Race: another client created the same party (uq_parties_name_ci).
        // Re-fetch instead of failing.
        if (isUniqueViolation(insertErr)) {
          const { data: refetched } = await supabase
            .from('parties')
            .select('id, name, gst_no, pan_no');
          party = (refetched || []).find(
            (p) => p.name.trim().toUpperCase() === targetName
          );
          if (!party) throw new Error('Failed to create party record');
        } else {
          throw insertErr;
        }
      } else {
        if (!inserted) throw new Error('Failed to create party record');
        party = inserted;
      }
    } else if ((!party.gst_no && gstNo) || (!party.pan_no && panNo)) {
      const upd: { gst_no?: string; pan_no?: string } = {};
      if (!party.gst_no && gstNo) upd.gst_no = gstNo;
      if (!party.pan_no && panNo) upd.pan_no = panNo;
      await supabase.from('parties').update(upd).eq('id', party.id);
    }

    if (!party) throw new Error('Party not found');

    const { error } = await supabase
      .from('party_transactions')
      .insert({
        party_id: party.id,
        cpin_no: input.cpinNo?.trim() || null,
        ddo_bill_no: ddoBillNo,
        bill_no: billNo,
        invoice_date: invoiceDate,
        settlement_date: settlementDate,
        transaction_date: settlementDate,
        amount: money(input.amount),
        cgst,
        sgst,
        igst,
        total_gst: totalGst,
        income_tax: incomeTax,
      });

    if (error) {
      if (isUniqueViolation(error)) {
        throw new Error('A transaction for this party and bill number already exists');
      }
      throw error;
    }
    return 'Transaction saved successfully';
  },

  async updateTransaction(id: string, updates: Partial<TransactionInput>): Promise<string> {
    const { data: current, error: curError } = await supabase
      .from('party_transactions')
      .select('ddo_bill_no, bill_no, invoice_date, settlement_date, transaction_date, amount, cgst, sgst, igst, income_tax, cpin_no')
      .eq('id', id)
      .single();
    if (curError || !current) throw new Error('Transaction not found');

    const upd: Database['public']['Tables']['party_transactions']['Update'] = {};
    if (updates.ddoBillNo !== undefined) {
      upd.ddo_bill_no = updates.ddoBillNo.trim() || null;
    }
    if (updates.billNo !== undefined) {
      const billNo = updates.billNo.trim();
      if (!billNo) throw new Error('Bill No is required');
      upd.bill_no = billNo;
    }
    if (updates.invoiceDate !== undefined) {
      if (updates.invoiceDate && !isValidDateString(updates.invoiceDate)) {
        throw new Error('Invalid invoice date (expected YYYY-MM-DD)');
      }
      upd.invoice_date = updates.invoiceDate || null;
    }
    if (updates.settlementDate !== undefined || updates.date !== undefined) {
      const sDate = (updates.settlementDate || updates.date)!.trim();
      if (!isValidDateString(sDate)) throw new Error('Invalid settlement date (expected YYYY-MM-DD)');
      upd.settlement_date = sDate;
      upd.transaction_date = sDate;
    }
    if (updates.amount !== undefined) {
      if (!(updates.amount > 0)) throw new Error('Amount must be greater than 0');
      upd.amount = money(updates.amount);
    }

    const cgstChanged = updates.cgst !== undefined;
    const sgstChanged = updates.sgst !== undefined;
    const igstChanged = updates.igst !== undefined;
    if (cgstChanged || sgstChanged || igstChanged) {
      const cgst = cgstChanged ? money(updates.cgst || 0) : money(current.cgst);
      const sgst = sgstChanged ? money(updates.sgst || 0) : money(current.sgst);
      const igst = igstChanged ? money(updates.igst || 0) : money(current.igst);
      if (cgst < 0 || sgst < 0 || igst < 0) throw new Error('GST amounts cannot be negative');
      if (cgstChanged) upd.cgst = cgst;
      if (sgstChanged) upd.sgst = sgst;
      if (igstChanged) upd.igst = igst;
      upd.total_gst = money(cgst + sgst + igst);
    }
    if (updates.incomeTax !== undefined) {
      if ((updates.incomeTax || 0) < 0) throw new Error('Income tax cannot be negative');
      upd.income_tax = money(updates.incomeTax || 0);
    }
    if (updates.cpinNo !== undefined) upd.cpin_no = updates.cpinNo.trim() || null;

    if (Object.keys(upd).length === 0) return 'Nothing to update';

    const { error } = await supabase
      .from('party_transactions')
      .update(upd)
      .eq('id', id);

    if (error) {
      if (isUniqueViolation(error)) {
        throw new Error('A transaction for this party and bill number already exists');
      }
      throw error;
    }
    return 'Transaction updated successfully';
  },

  async deleteTransaction(id: string): Promise<string> {
    const { error } = await supabase
      .from('party_transactions')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return 'Transaction deleted successfully';
  },

  async getGSTReport(fy: number, quarter: string): Promise<GSTReport> {
    const range = quarter === 'Yearly' ? fyBounds(fy) : quarterBounds(fy, quarter);
    if (!range) throw new Error('Invalid quarter');

    const { data, error } = await supabase
      .from('party_transactions')
      .select('id, ddo_bill_no, bill_no, cpin_no, invoice_date, settlement_date, transaction_date, amount, cgst, sgst, igst, total_gst, parties(name, gst_no)')
      .gte('transaction_date', range.from)
      .lt('transaction_date', range.to)
      .order('transaction_date')
      .order('id');

    if (error) throw error;

    type GSTTxJoined = {
      id: string;
      ddo_bill_no: string | null;
      bill_no: string;
      cpin_no: string | null;
      invoice_date: string | null;
      settlement_date: string | null;
      transaction_date: string;
      amount: number;
      cgst: number;
      sgst: number;
      igst: number;
      total_gst: number;
      parties: { name: string; gst_no: string | null } | null;
    };

    const filtered = ((data || []) as unknown as GSTTxJoined[]).filter(
      (tx) => tx.transaction_date >= range.from && tx.transaction_date < range.to
    );

    const rows = filtered.map((tx) => ({
      partyName: tx.parties?.name || 'Unknown',
      gstNo: tx.parties?.gst_no || '-',
      cpinNo: tx.cpin_no || '-',
      ddoBillNo: tx.ddo_bill_no || '-',
      billNo: tx.bill_no,
      invoiceDate: tx.invoice_date || tx.transaction_date,
      settlementDate: tx.settlement_date || tx.transaction_date,
      date: tx.settlement_date || tx.transaction_date,
      amount: money(tx.amount),
      cgst: money(tx.cgst),
      sgst: money(tx.sgst),
      igst: money(tx.igst),
      totalGst: money(tx.total_gst),
    }));

    return {
      fy,
      quarter,
      rows,
      totals: {
        amount: money(rows.reduce((s, r) => s + r.amount, 0)),
        cgst: money(rows.reduce((s, r) => s + r.cgst, 0)),
        sgst: money(rows.reduce((s, r) => s + r.sgst, 0)),
        igst: money(rows.reduce((s, r) => s + r.igst, 0)),
        totalGst: money(rows.reduce((s, r) => s + r.totalGst, 0)),
      },
    };
  },

  async getIncomeTaxReport(fy: number, quarter: string): Promise<IncomeTaxReport> {
    const range = quarter === 'Yearly' ? fyBounds(fy) : quarterBounds(fy, quarter);
    if (!range) throw new Error('Invalid quarter');

    const { data, error } = await supabase
      .from('party_transactions')
      .select('id, ddo_bill_no, bill_no, invoice_date, settlement_date, transaction_date, amount, income_tax, parties(name, pan_no)')
      .gte('transaction_date', range.from)
      .lt('transaction_date', range.to)
      .order('transaction_date')
      .order('id');

    if (error) throw error;

    type ITTxJoined = {
      id: string;
      ddo_bill_no: string | null;
      bill_no: string;
      invoice_date: string | null;
      settlement_date: string | null;
      transaction_date: string;
      amount: number;
      income_tax: number;
      parties: { name: string; pan_no: string | null } | null;
    };

    const filtered = ((data || []) as unknown as ITTxJoined[]).filter(
      (tx) => tx.transaction_date >= range.from && tx.transaction_date < range.to
    );

    const rows = filtered.map((tx) => ({
      partyName: tx.parties?.name || 'Unknown',
      panNo: tx.parties?.pan_no || '-',
      ddoBillNo: tx.ddo_bill_no || '-',
      billNo: tx.bill_no,
      invoiceDate: tx.invoice_date || tx.transaction_date,
      settlementDate: tx.settlement_date || tx.transaction_date,
      date: tx.settlement_date || tx.transaction_date,
      amount: money(tx.amount),
      incomeTax: money(tx.income_tax),
    }));

    return {
      fy,
      quarter,
      rows,
      totals: {
        amount: money(rows.reduce((s, r) => s + r.amount, 0)),
        incomeTax: money(rows.reduce((s, r) => s + r.incomeTax, 0)),
      },
    };
  },

  async saveBulkTransactions(
    inputs: TransactionInput[]
  ): Promise<{ saved: number; errors: string[] }> {
    let saved = 0;
    const errors: string[] = [];

    // Pre-fetch all parties
    const { data: existingParties } = await supabase
      .from('parties')
      .select('id, name, gst_no, pan_no');

    type CachedParty = { id: string; name: string; gst_no: string | null; pan_no: string | null };
    const partyCache = new Map<string, CachedParty>();
    for (const p of existingParties || []) {
      partyCache.set(p.name.trim().toUpperCase(), p);
    }

    // In-file duplicate guard: (UPPER(name), LOWER(bill_no)) seen in this payload.
    const seenInFile = new Set<string>();

    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i];
      const rowLabel = `Row ${i + 1} (${input.partyName || 'unnamed'})`;

      try {
        if (!input.partyName?.trim()) {
          errors.push(`${rowLabel}: Party name is required`);
          continue;
        }
        if (!input.billNo?.trim()) {
          errors.push(`${rowLabel}: Bill number is required`);
          continue;
        }
        const settlementDate = input.settlementDate?.trim() || input.date?.trim() || '';
        const invoiceDate = input.invoiceDate?.trim() || settlementDate;
        const ddoBillNo = input.ddoBillNo?.trim() || null;

        if (!settlementDate) {
          errors.push(`${rowLabel}: Settlement Date is required`);
          continue;
        }
        if (!isValidDateString(settlementDate)) {
          errors.push(`${rowLabel}: Invalid Settlement Date "${settlementDate}" (expected YYYY-MM-DD)`);
          continue;
        }
        if (invoiceDate && !isValidDateString(invoiceDate)) {
          errors.push(`${rowLabel}: Invalid Invoice Date "${invoiceDate}" (expected YYYY-MM-DD)`);
          continue;
        }
        if (!(input.amount > 0)) {
          errors.push(`${rowLabel}: Amount must be greater than 0`);
          continue;
        }
        if ((input.cgst || 0) < 0 || (input.sgst || 0) < 0 || (input.igst || 0) < 0) {
          errors.push(`${rowLabel}: GST amounts cannot be negative`);
          continue;
        }
        if ((input.incomeTax || 0) < 0) {
          errors.push(`${rowLabel}: Income tax cannot be negative`);
          continue;
        }

        const gstNo = input.gstNo?.trim().toUpperCase() || '';
        const panNo = input.panNo?.trim().toUpperCase() || '';
        if (gstNo && !GST_REGEX.test(gstNo)) {
          errors.push(`${rowLabel}: Invalid GST No format`);
          continue;
        }
        if (panNo && !PAN_REGEX.test(panNo)) {
          errors.push(`${rowLabel}: Invalid PAN No format`);
          continue;
        }

        const billNo = input.billNo.trim();
        const targetName = input.partyName.trim().toUpperCase();
        const fileKey = `${targetName}||${billNo.toLowerCase()}`;
        if (seenInFile.has(fileKey)) {
          errors.push(`${rowLabel}: Duplicate bill no "${billNo}" for this party in the same file`);
          continue;
        }
        seenInFile.add(fileKey);

        // Find or create party
        let party = partyCache.get(targetName);
        if (!party) {
          const { data: inserted, error: insertErr } = await supabase
            .from('parties')
            .insert({
              name: input.partyName.trim(),
              gst_no: gstNo || null,
              pan_no: panNo || null,
            })
            .select()
            .single();

          if (insertErr) {
            if (isUniqueViolation(insertErr)) {
              // Another row in this file (or concurrent client) won the race.
              const { data: refetched } = await supabase
                .from('parties')
                .select('id, name, gst_no, pan_no');
              party = (refetched || []).find(
                (p) => p.name.trim().toUpperCase() === targetName
              );
              if (party) partyCache.set(targetName, party);
              else {
                errors.push(`${rowLabel}: Failed to create party — ${insertErr.message}`);
                continue;
              }
            } else {
              errors.push(`${rowLabel}: Failed to create party — ${insertErr.message}`);
              continue;
            }
          } else {
            party = inserted;
            partyCache.set(targetName, party);
          }
        }

        const cgst = money(input.cgst || 0);
        const sgst = money(input.sgst || 0);
        const igst = money(input.igst || 0);
        const totalGst = money(cgst + sgst + igst);
        const incomeTax = money(input.incomeTax || 0);

        const { error: txErr } = await supabase
          .from('party_transactions')
          .insert({
            party_id: party.id,
            cpin_no: input.cpinNo?.trim() || null,
            ddo_bill_no: ddoBillNo,
            bill_no: billNo,
            invoice_date: invoiceDate,
            settlement_date: settlementDate,
            transaction_date: settlementDate,
            amount: money(input.amount),
            cgst,
            sgst,
            igst,
            total_gst: totalGst,
            income_tax: incomeTax,
          });

        if (txErr) {
          if (isUniqueViolation(txErr)) {
            errors.push(`${rowLabel}: Duplicate bill no "${billNo}" for this party`);
          } else {
            errors.push(`${rowLabel}: ${txErr.message}`);
          }
          continue;
        }

        saved++;
      } catch (err) {
        errors.push(`${rowLabel}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    return { saved, errors };
  },
};
