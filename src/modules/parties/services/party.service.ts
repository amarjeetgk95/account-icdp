import { partyRepository } from '../repositories/party.repository';
import type {
  Party,
  PartyTransaction,
  TransactionInput,
  GSTReport,
  IncomeTaxReport,
} from '../types';

const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/;
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

class PartyService {
  private validateTransactionInput(input: TransactionInput): string | null {
    if (!input.partyName?.trim()) return 'Party name is required';
    if (!input.billNo?.trim()) return 'Bill number is required';
    if (!input.date) return 'Date is required';
    if (!input.amount || input.amount <= 0) return 'Amount must be greater than 0';
    const gst = input.gstNo?.trim().toUpperCase() || '';
    if (gst && !GST_REGEX.test(gst)) return 'Invalid GST number format';
    const pan = input.panNo?.trim().toUpperCase() || '';
    if (pan && !PAN_REGEX.test(pan)) return 'Invalid PAN number format';
    return null;
  }

  async listParties(): Promise<Party[]> {
    return partyRepository.listParties();
  }

  async listTransactions(): Promise<PartyTransaction[]> {
    return partyRepository.listTransactions();
  }

  async saveTransaction(input: TransactionInput): Promise<string> {
    return partyRepository.saveTransaction(input);
  }

  async updateTransaction(id: string, updates: Partial<TransactionInput>): Promise<string> {
    return partyRepository.updateTransaction(id, updates);
  }

  async deleteTransaction(id: string): Promise<string> {
    return partyRepository.deleteTransaction(id);
  }

  async saveBulkTransactions(
    inputs: TransactionInput[]
  ): Promise<{ saved: number; errors: string[] }> {
    if (!inputs || inputs.length === 0) {
      return { saved: 0, errors: ['No transactions to import'] };
    }

    // Pre-validate all inputs
    const validInputs: TransactionInput[] = [];
    const errors: string[] = [];

    for (let i = 0; i < inputs.length; i++) {
      const error = this.validateTransactionInput(inputs[i]);
      if (error) {
        errors.push(`Row ${i + 1}: ${error}`);
      } else {
        validInputs.push(inputs[i]);
      }
    }

    if (validInputs.length === 0) {
      return { saved: 0, errors };
    }

    const result = await partyRepository.saveBulkTransactions(validInputs);
    return {
      saved: result.saved,
      errors: [...errors, ...result.errors],
    };
  }

  async getGSTReport(fy: number, quarter: string, officeId?: string): Promise<GSTReport> {
    if (!['Q1', 'Q2', 'Q3', 'Q4', 'Yearly'].includes(quarter)) {
      throw new Error('Invalid quarter');
    }
    return partyRepository.getGSTReport(fy, quarter, officeId);
  }

  async getIncomeTaxReport(fy: number, quarter: string, officeId?: string): Promise<IncomeTaxReport> {
    if (!['Q1', 'Q2', 'Q3', 'Q4', 'Yearly'].includes(quarter)) {
      throw new Error('Invalid quarter');
    }
    return partyRepository.getIncomeTaxReport(fy, quarter, officeId);
  }
}

export const partyService = new PartyService();

