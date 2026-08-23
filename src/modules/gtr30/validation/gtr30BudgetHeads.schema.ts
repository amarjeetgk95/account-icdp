import { z } from 'zod';
import { gtr30PostItemSchema } from './gtr30Bill.schema';

const budgetHeadSchema = z.object({
  id: z.string(),
  name: z.string(),
  headChargeable: z.string().optional(),
  controllingOfficer: z.string().optional(),
  classOfExpenditure: z.string().optional(),
  fund: z.string().optional(),
  drawingOfficer: z.string().optional(),
  demandNo: z.string().optional(),
  typeOfBudget: z.string().optional(),
  schemeNo: z.string().optional(),
  sector: z.string().optional(),
  majorHead: z.string().optional(),
  subMajorHead: z.string().optional(),
  minorHead: z.string().optional(),
  subHead: z.string().optional(),
  budgetYear: z.string().optional(),
  establishmentPosts: z.array(gtr30PostItemSchema).optional(),
});

export const gtr30BudgetHeadsSchema = z.array(budgetHeadSchema);

export type Gtr30BudgetHeadsInput = z.infer<typeof gtr30BudgetHeadsSchema>;