import type { GTR30Bill, GTR30BillStatus, GTR30FormData } from '../types';
import { billTotals } from './gtr30Calc.service';
import { gtr30BillRegisterRepository } from '../repositories/billRegister.repository';

class Gtr30BillsService {
  async listBills(): Promise<GTR30Bill[]> {
    return gtr30BillRegisterRepository.list();
  }

  async getBill(id: string): Promise<GTR30Bill | null> {
    return gtr30BillRegisterRepository.get(id);
  }

  async saveBill(form: GTR30FormData & { status?: GTR30BillStatus }, existing: GTR30Bill | null): Promise<GTR30Bill> {
    const now = new Date().toISOString();
    const totals = billTotals(form as GTR30FormData);
    const deterministicFallback = [form.billCode, form.monthOf].filter(Boolean).join('-') || 'GTR30-DRAFT';
    let candidateNo = form.billRegisterNo || existing?.billRegisterNo || deterministicFallback;
    // Ensure uniqueness without random numbers: if candidate collides with another bill in same office, append sequential suffix -2, -3, etc.
    if (!existing || candidateNo !== existing.billRegisterNo) {
      candidateNo = await this.ensureUniqueBillRegNo(candidateNo, existing?.id);
    }
    const bill: GTR30Bill = {
      ...(form as GTR30FormData),
      id: existing?.id ?? crypto.randomUUID(),
      billRegisterNo: candidateNo,
      createdDate: existing?.createdDate ?? now,
      updatedDate: now,
      grossTotal: totals.gross,
      deductionsTotal: totals.deductions,
      netTotal: totals.net,
      status: form.status ?? existing?.status ?? 'draft',
    };
    return gtr30BillRegisterRepository.save(bill);
  }

  private async ensureUniqueBillRegNo(baseNo: string, excludeId?: string): Promise<string> {
    const existingBills = await gtr30BillRegisterRepository.list();
    const existingNos = new Set(
      existingBills.filter((b) => b.id !== excludeId).map((b) => b.billRegisterNo)
    );
    if (!existingNos.has(baseNo)) return baseNo;
    let seq = 2;
    while (existingNos.has(`${baseNo}-${seq}`)) seq++;
    return `${baseNo}-${seq}`;
  }

  async updateBillStatus(id: string, status: GTR30BillStatus): Promise<GTR30Bill> {
    const existing = await gtr30BillRegisterRepository.get(id);
    if (!existing) throw new Error('Bill not found');
    const updated: GTR30Bill = {
      ...existing,
      status,
      updatedDate: new Date().toISOString(),
    };
    return gtr30BillRegisterRepository.save(updated);
  }

  async duplicateBill(source: GTR30Bill): Promise<GTR30Bill> {
    const copy = JSON.parse(JSON.stringify(source)) as GTR30Bill;
    const now = new Date().toISOString();
    
    const baseNo = source.billRegisterNo || 'GTR30';
    const existingBills = await gtr30BillRegisterRepository.list();
    const sameOfficeMonth = existingBills.filter(
      (b) => b.officeName === source.officeName && b.monthOf === source.monthOf
    );
    const copyNumbers = sameOfficeMonth
      .map((b) => {
        const match = b.billRegisterNo?.match(new RegExp(`^${baseNo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:-COPY(?: (\\d+))?)?$`));
        if (match) return match[1] ? parseInt(match[1], 10) : 1;
        return null;
      })
      .filter((n): n is number => n !== null);
    const nextCopyNum = copyNumbers.length > 0 ? Math.max(...copyNumbers) + 1 : 1;
    const copySuffix = nextCopyNum === 1 ? '-COPY' : `-COPY ${nextCopyNum}`;

    const draftCopy: GTR30Bill = {
      ...copy,
      id: crypto.randomUUID(),
      billRegisterNo: `${baseNo}${copySuffix}`,
      status: 'draft',
      createdDate: now,
      updatedDate: now,
    };
    return gtr30BillRegisterRepository.save(draftCopy);
  }

  async deleteBill(id: string): Promise<void> {
    return gtr30BillRegisterRepository.delete(id);
  }

  exportBillAsJson(bill: GTR30Bill): string {
    return JSON.stringify(bill, null, 2);
  }

  exportAllAsJson(bills: GTR30Bill[]): string {
    return JSON.stringify(bills, null, 2);
  }

  parseImportedJson(content: string): GTR30Bill[] {
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      return [];
    }
    const list: unknown[] = Array.isArray(parsed) ? parsed : [parsed];
    const valid: GTR30Bill[] = [];
    for (const item of list) {
      if (!isBillLike(item)) continue;
      // Flatten nested `data` (legacy shape) without leaving a `data` key behind.
      const { data, ...rest } = item;
      void data;
      valid.push({
        ...data,
        ...rest,
      } as unknown as GTR30Bill);
    }
    return valid;
  }
}

interface BillRowShape {
  id?: string;
  billRegisterNo?: string;
  data?: GTR30FormData;
  employees?: unknown[];
  headChargeable?: string;
  employees_data?: unknown[];
}

function isBillLike(value: unknown): value is BillRowShape {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  const hasData = typeof v.data === 'object' && v.data !== null && !Array.isArray(v.data);
  const hasFormData =
    Array.isArray(v.employees) &&
    typeof v.headChargeable === 'string';
  return hasData || hasFormData;
}

export const gtr30BillsService = new Gtr30BillsService();
