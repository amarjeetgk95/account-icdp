import { supabase } from '@/core/supabase/client';
import { useUIStore } from '@/core/stores/ui-store';
import { useAuthStore } from '@/core/auth/store';
import { MONTHS } from '@/shared/constants';
import type { Party, PartyTransaction, TransactionInput, GSTReport, IncomeTaxReport } from '../types';


function getOfficeId(): string | null {
  const authOfficeId = useAuthStore.getState().user?.officeId || null;
  if (authOfficeId) return authOfficeId;
  return useUIStore.getState().activeOfficeId || null;
}

function money(value: number): number {
  return Math.round(value * 100) / 100;
}

export const partyRepository = {
  async listParties(): Promise<Party[]> {
    const officeId = getOfficeId();
    if (!officeId) throw new Error('No office selected');

    const { data, error } = await supabase
      .from('parties')
      .select('id, name, gst_no, pan_no')
      .eq('office_id', officeId)
      .order('name');

    if (error) throw error;
    return data || [];
  },

  async listTransactions(): Promise<PartyTransaction[]> {
    const officeId = getOfficeId();
    if (!officeId) throw new Error('No office selected');

    const { data, error } = await supabase
      .from('party_transactions')
      .select('id, bill_no, transaction_date, amount, cgst, sgst, igst, total_gst, income_tax, parties(id, name)')
      .eq('office_id', officeId)
      .order('id', { ascending: false });

    if (error) throw error;

    return (data || []).map((tx: any) => ({
      id: tx.id,
      party_id: tx.parties?.id || '',
      party_name: tx.parties?.name || 'Unknown',
      bill_no: tx.bill_no,
      transaction_date: tx.transaction_date,
      amount: tx.amount,
      cgst: tx.cgst,
      sgst: tx.sgst,
      igst: tx.igst,
      total_gst: tx.total_gst,
      income_tax: tx.income_tax,
    }));
  },

  async saveTransaction(input: TransactionInput): Promise<string> {
    const officeId = getOfficeId();
    if (!officeId) throw new Error('No office selected');

    if (!input.partyName.trim()) throw new Error('Party Name is required');
    if (!input.billNo.trim()) throw new Error('Bill No is required');
    if (!input.date) throw new Error('Date is required');
    if (input.amount <= 0) throw new Error('Amount must be greater than 0');

    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/;
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

    const gstNo = input.gstNo?.trim().toUpperCase() || '';
    const panNo = input.panNo?.trim().toUpperCase() || '';

    if (gstNo && !gstRegex.test(gstNo)) throw new Error('Invalid GST No format');
    if (panNo && !panRegex.test(panNo)) throw new Error('Invalid PAN No format');

    const cgst = money(input.cgst || 0);
    const sgst = money(input.sgst || 0);
    const igst = money(input.igst || 0);
    const incomeTax = money(input.incomeTax || 0);
    const totalGst = cgst + sgst + igst;

    const { data: parties } = await supabase
      .from('parties')
      .select('id, name, gst_no, pan_no')
      .eq('office_id', officeId);

    const targetName = input.partyName.trim().toUpperCase();
    let party = (parties || []).find(
      (p) => p.name.trim().toUpperCase() === targetName
    );

    if (!party) {
      const { data: inserted } = await supabase
        .from('parties')
        .insert({
          name: input.partyName.trim(),
          gst_no: gstNo || null,
          pan_no: panNo || null,
          office_id: officeId,
        })
        .select()
        .single();
      if (!inserted) throw new Error('Failed to create party record');
      party = inserted;
    } else if ((!party.gst_no && gstNo) || (!party.pan_no && panNo)) {
      const upd: any = {};
      if (!party.gst_no && gstNo) upd.gst_no = gstNo;
      if (!party.pan_no && panNo) upd.pan_no = panNo;
      await supabase.from('parties').update(upd).eq('id', party.id);
    }

    if (!party) throw new Error('Party not found');

    const { data: dups } = await supabase
      .from('party_transactions')
      .select('id')
      .eq('party_id', party.id)
      .eq('bill_no', input.billNo.trim())
      .eq('office_id', officeId);

    if (dups && dups.length > 0) {
      throw new Error('A transaction for this party and bill number already exists');
    }

    const { error } = await supabase
      .from('party_transactions')
      .insert({
        party_id: party.id,
        office_id: officeId,
        cpin_no: input.cpinNo?.trim() || null,
        bill_no: input.billNo.trim(),
        transaction_date: input.date,
        amount: money(input.amount),
        cgst,
        sgst,
        igst,
        total_gst: totalGst,
        income_tax: incomeTax,
      });

    if (error) throw error;
    return 'Transaction saved successfully';
  },

  async updateTransaction(id: string, updates: Partial<TransactionInput>): Promise<string> {
    const officeId = getOfficeId();
    if (!officeId) throw new Error('No office selected');

    const upd: any = {};
    if (updates.billNo !== undefined) upd.bill_no = updates.billNo.trim() || null;
    if (updates.date !== undefined) upd.transaction_date = updates.date;
    if (updates.amount !== undefined) upd.amount = money(updates.amount);
    if (updates.cgst !== undefined) upd.cgst = money(updates.cgst || 0);
    if (updates.sgst !== undefined) upd.sgst = money(updates.sgst || 0);
    if (updates.igst !== undefined) upd.igst = money(updates.igst || 0);
    if (updates.incomeTax !== undefined) upd.income_tax = money(updates.incomeTax || 0);
    if (updates.cpinNo !== undefined) upd.cpin_no = updates.cpinNo.trim() || null;

    const { error } = await supabase
      .from('party_transactions')
      .update(upd)
      .eq('id', id)
      .eq('office_id', officeId);

    if (error) throw error;
    return 'Transaction updated successfully';
  },

  async deleteTransaction(id: string): Promise<string> {
    const officeId = getOfficeId();
    if (!officeId) throw new Error('No office selected');

    const { error } = await supabase
      .from('party_transactions')
      .delete()
      .eq('id', id)
      .eq('office_id', officeId);

    if (error) throw error;
    return 'Transaction deleted successfully';
  },

  async getGSTReport(fy: number, quarter: string, officeId?: string): Promise<GSTReport> {
    const targetOfficeId = officeId || getOfficeId();
    if (!targetOfficeId) throw new Error('No office selected');

    const quarterMonths: Record<string, string[]> = {
      Q1: ['April', 'May', 'June'],
      Q2: ['July', 'August', 'September'],
      Q3: ['October', 'November', 'December'],
      Q4: ['January', 'February', 'March'],
    };

    const isYearly = quarter === 'Yearly';
    const months = isYearly ? MONTHS : quarterMonths[quarter] || quarterMonths.Q1;

    const { data, error } = await supabase
      .from('party_transactions')
      .select('bill_no, cpin_no, transaction_date, amount, cgst, sgst, igst, total_gst, parties(name, gst_no)')
      .eq('office_id', targetOfficeId)
      .gte('transaction_date', `${fy}-04-01`)
      .order('id');

    if (error) throw error;

    const monthRanges = months.map((m) => {
      const monthNum = MONTHS.indexOf(m);
      const year = monthNum < 9 ? fy : fy + 1;
      const month = ((monthNum + 3) % 12) + 1;
      return { year, month };
    });

    const filtered = (data || []).filter((tx: any) => {
      const date = new Date(tx.transaction_date);
      if (isYearly) {
        const txMonth = date.getMonth();
        const txFy = txMonth >= 3 ? date.getFullYear() : date.getFullYear() - 1;
        return txFy === fy;
      }
      return monthRanges.some(
        (r) => date.getFullYear() === r.year && date.getMonth() + 1 === r.month
      );
    });

    const rows = filtered.map((tx: any) => ({
      partyName: tx.parties?.name || 'Unknown',
      gstNo: tx.parties?.gst_no || '-',
      cpinNo: tx.cpin_no || '-',
      billNo: tx.bill_no,
      date: tx.transaction_date,
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
        amount: money(rows.reduce((s: number, r: any) => s + r.amount, 0)),
        cgst: money(rows.reduce((s: number, r: any) => s + r.cgst, 0)),
        sgst: money(rows.reduce((s: number, r: any) => s + r.sgst, 0)),
        igst: money(rows.reduce((s: number, r: any) => s + r.igst, 0)),
        totalGst: money(rows.reduce((s: number, r: any) => s + r.totalGst, 0)),
      },
    };
  },

  async getIncomeTaxReport(fy: number, quarter: string, officeId?: string): Promise<IncomeTaxReport> {
    const targetOfficeId = officeId || getOfficeId();
    if (!targetOfficeId) throw new Error('No office selected');

    const quarterMonths: Record<string, string[]> = {
      Q1: ['April', 'May', 'June'],
      Q2: ['July', 'August', 'September'],
      Q3: ['October', 'November', 'December'],
      Q4: ['January', 'February', 'March'],
    };

    const isYearly = quarter === 'Yearly';
    const months = isYearly ? MONTHS : quarterMonths[quarter] || quarterMonths.Q1;

    const { data, error } = await supabase
      .from('party_transactions')
      .select('bill_no, transaction_date, amount, income_tax, parties(name, pan_no)')
      .eq('office_id', targetOfficeId)
      .gte('transaction_date', `${fy}-04-01`)
      .order('id');

    if (error) throw error;

    const monthRanges = months.map((m) => {
      const monthNum = MONTHS.indexOf(m);
      const year = monthNum < 9 ? fy : fy + 1;
      const month = ((monthNum + 3) % 12) + 1;
      return { year, month };
    });

    const filtered = (data || []).filter((tx: any) => {
      const date = new Date(tx.transaction_date);
      if (isYearly) {
        const txMonth = date.getMonth();
        const txFy = txMonth >= 3 ? date.getFullYear() : date.getFullYear() - 1;
        return txFy === fy;
      }
      return monthRanges.some(
        (r) => date.getFullYear() === r.year && date.getMonth() + 1 === r.month
      );
    });

    const rows = filtered.map((tx: any) => ({
      partyName: tx.parties?.name || 'Unknown',
      panNo: tx.parties?.pan_no || '-',
      billNo: tx.bill_no,
      date: tx.transaction_date,
      amount: money(tx.amount),
      incomeTax: money(tx.income_tax),
    }));

    return {
      fy,
      quarter,
      rows,
      totals: {
        amount: money(rows.reduce((s: number, r: any) => s + r.amount, 0)),
        incomeTax: money(rows.reduce((s: number, r: any) => s + r.incomeTax, 0)),
      },
    };
  },

  async saveBulkTransactions(
    inputs: TransactionInput[]
  ): Promise<{ saved: number; errors: string[] }> {
    const officeId = getOfficeId();
    if (!officeId) throw new Error('No office selected');

    let saved = 0;
    const errors: string[] = [];

    // Pre-fetch all parties for this office to avoid repeated queries
    const { data: existingParties } = await supabase
      .from('parties')
      .select('id, name, gst_no, pan_no')
      .eq('office_id', officeId);

    const partyCache = new Map<string, any>();
    for (const p of existingParties || []) {
      partyCache.set(p.name.trim().toUpperCase(), p);
    }

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
        if (!input.amount || input.amount <= 0) {
          errors.push(`${rowLabel}: Amount must be greater than 0`);
          continue;
        }

        const gstNo = input.gstNo?.trim().toUpperCase() || '';
        const panNo = input.panNo?.trim().toUpperCase() || '';
        const targetName = input.partyName.trim().toUpperCase();

        // Find or create party
        let party = partyCache.get(targetName);
        if (!party) {
          const { data: inserted, error: insertErr } = await supabase
            .from('parties')
            .insert({
              name: input.partyName.trim(),
              gst_no: gstNo || null,
              pan_no: panNo || null,
              office_id: officeId,
            })
            .select()
            .single();

          if (insertErr) {
            errors.push(`${rowLabel}: Failed to create party — ${insertErr.message}`);
            continue;
          }
          party = inserted;
          partyCache.set(targetName, party);
        }

        // Check for duplicate bill_no
        const { data: dups } = await supabase
          .from('party_transactions')
          .select('id')
          .eq('party_id', party.id)
          .eq('bill_no', input.billNo.trim())
          .eq('office_id', officeId);

        if (dups && dups.length > 0) {
          errors.push(`${rowLabel}: Duplicate bill no "${input.billNo}" for this party`);
          continue;
        }

        const cgst = money(input.cgst || 0);
        const sgst = money(input.sgst || 0);
        const igst = money(input.igst || 0);
        const totalGst = cgst + sgst + igst;
        const incomeTax = money(input.incomeTax || 0);

        const { error: txErr } = await supabase
          .from('party_transactions')
          .insert({
            party_id: party.id,
            office_id: officeId,
            cpin_no: input.cpinNo?.trim() || null,
            bill_no: input.billNo.trim(),
            transaction_date: input.date || new Date().toISOString().split('T')[0],
            amount: money(input.amount),
            cgst,
            sgst,
            igst,
            total_gst: totalGst,
            income_tax: incomeTax,
          });

        if (txErr) {
          errors.push(`${rowLabel}: ${txErr.message}`);
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
