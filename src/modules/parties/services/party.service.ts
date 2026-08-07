import { partyRepository } from '../repositories/party.repository';
import type {
  Party,
  PartyTransaction,
  TransactionInput,
  GSTReport,
  IncomeTaxReport,
} from '../types';

export class PartyService {
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
