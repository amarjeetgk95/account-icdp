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

  async getGSTReport(fy: number, quarter: string): Promise<GSTReport> {
    if (!['Q1', 'Q2', 'Q3', 'Q4'].includes(quarter)) {
      throw new Error('Invalid quarter');
    }
    return partyRepository.getGSTReport(fy, quarter);
  }

  async getIncomeTaxReport(fy: number, quarter: string): Promise<IncomeTaxReport> {
    if (!['Q1', 'Q2', 'Q3', 'Q4'].includes(quarter)) {
      throw new Error('Invalid quarter');
    }
    return partyRepository.getIncomeTaxReport(fy, quarter);
  }
}

export const partyService = new PartyService();
