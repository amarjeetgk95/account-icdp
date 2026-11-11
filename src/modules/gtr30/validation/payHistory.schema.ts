import { z } from 'zod';

const ISO_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function isValidIsoDate(v: string): boolean {
  if (!ISO_REGEX.test(v)) return false;
  const d = new Date(v);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

export const payEntrySchema = z
  .object({
    id: z.string().trim().min(1, 'id required'),
    startDate: z.string().trim().refine(isValidIsoDate, 'startDate must be YYYY-MM-DD'),
    endDate: z.string().trim().refine(isValidIsoDate, 'endDate must be YYYY-MM-DD').optional().or(z.literal('').transform(() => undefined)),
    basicPay: z.coerce.number().int().min(0, 'basicPay >=0').max(99_999_999),
    reason: z.enum(['increment', 'promotion', 'revision', 'da-revision', 'correction', 'other']).optional(),
    orderNo: z.string().trim().max(50).optional(),
    remark: z.string().trim().max(200).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.endDate && v.endDate < v.startDate) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'endDate cannot be before startDate', path: ['endDate'] });
    }
  });

export const payHistorySchema = z.array(payEntrySchema).superRefine((arr, ctx) => {
  const sorted = [...arr].sort((a, b) => (a.startDate < b.startDate ? -1 : a.startDate > b.startDate ? 1 : 0));
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].startDate <= sorted[i - 1].startDate) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `duplicate startDate ${sorted[i].startDate}`, path: [i, 'startDate'] });
    }
    const prev = sorted[i - 1];
    if (!prev.endDate) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `previous entry ${prev.startDate} must have endDate before ${sorted[i].startDate}`, path: [i, 'startDate'] });
    } else if (prev.endDate >= sorted[i].startDate) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `overlaps ${prev.startDate}–${prev.endDate}`, path: [i, 'startDate'] });
    }
  }
});

export type PayEntryInput = z.infer<typeof payEntrySchema>;
