import { z } from 'zod';

const billCodeMappingSchema = z.object({
  id: z.string().trim().min(1, 'id is required'),
  billCode: z.string().trim().min(1, 'Bill code is required').max(50, 'Bill code must be at most 50 characters').transform((v) => v.toUpperCase()),
  description: z.string().trim(),
  monthKey: z.string().optional(),
  budgetHeadId: z.string().optional(),
  controllingOfficer: z.string().optional(),
  classOfExpenditure: z.string().optional(),
  fund: z.string().optional(),
  drawingOfficer: z.string().optional(),
  demandNo: z.string().optional(),
  demandNoLabel: z.string().optional(),
  typeOfBudget: z.string().optional(),
  schemeNo: z.string().optional(),
  headChargeable: z.string().optional(),
  sector: z.string().optional(),
  majorHead: z.string().optional(),
  subMajorHead: z.string().optional(),
  minorHead: z.string().optional(),
  subHead: z.string().optional(),
  budgetYear: z.string().optional(),
});

export const gtr30BillCodeMappingsSchema = z.array(billCodeMappingSchema);

export type Gtr30BillCodeMappingsInput = z.infer<typeof gtr30BillCodeMappingsSchema>;