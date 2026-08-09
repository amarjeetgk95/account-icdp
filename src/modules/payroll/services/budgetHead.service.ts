import { budgetHeadRepository } from '../repositories/budgetHead.repository';
import type { Database } from '@/shared/database.types';
import type { BudgetHeadInput } from '../types';

type BudgetHeadRow = Database['public']['Tables']['budget_heads']['Row'];

export class BudgetHeadService {
  async listBudgetHeads(): Promise<BudgetHeadRow[]> {
    return budgetHeadRepository.list();
  }

  async addBudgetHead(input: BudgetHeadInput): Promise<BudgetHeadRow> {
    return budgetHeadRepository.create(this.normalize(input));
  }

  async updateBudgetHead(input: BudgetHeadInput): Promise<BudgetHeadRow> {
    if (!input.id) {
      throw new Error('Budget head ID is required for update');
    }
    return budgetHeadRepository.update(this.normalize(input));
  }

  async deleteBudgetHead(id: string): Promise<void> {
    if (!id) throw new Error('Budget head ID is required');
    await budgetHeadRepository.delete(id);
  }

  private normalize(input: BudgetHeadInput): BudgetHeadInput {
    const code = (input.code || '').trim();
    const name = (input.name || '').trim();

    if (!code) {
      throw new Error('Budget head code is required');
    }
    if (code.length > 20) {
      throw new Error('Budget head code must be at most 20 characters');
    }
    if (!name) {
      throw new Error('Budget head name is required');
    }
    if (name.length > 100) {
      throw new Error('Budget head name must be at most 100 characters');
    }

    return { ...input, code, name };
  }
}

export const budgetHeadService = new BudgetHeadService();
