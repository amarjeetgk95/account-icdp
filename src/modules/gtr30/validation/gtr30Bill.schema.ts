import { z } from 'zod';
import { GTR30_BILL_STATUSES } from '../types/bill';

export const gtr30EmployeeSchema = z.object({
  id: z.string().min(1, 'Employee ID is required'),
  srNo: z.coerce.number().min(1, 'Sr No must be positive'),
  name: z.string().min(1, 'Employee name is required'),
  hrpnNo: z.string().optional().default(''),
  designation: z.string().optional().default(''),
  designationGujarati: z.string().optional().default(''),
  cadreClass: z.string().optional().default(''),
  payScale: z.string().optional().default(''),
  gradePay: z.string().optional().default(''),
  payLevelCell: z.string().optional().default(''),
    ppaNo: z.string().optional().default(''),
  ph: z.string().optional().default(''),
  slo: z.string().optional().default(''),
  quarterAddress: z.string().optional().default(''),
  insuranceGroup: z.string().optional().default(''),
  payOfEstablishment: z.coerce.number().min(0, 'Pay cannot be negative').default(0),
  payOfOfficer: z.coerce.number().min(0, 'Pay cannot be negative').default(0),
  da: z.coerce.number().min(0, 'DA cannot be negative').default(0),
  cla: z.coerce.number().min(0, 'CLA cannot be negative').default(0),
  medicalAllowance: z.coerce.number().min(0, 'Medical allowance cannot be negative').default(0),
  transportAllowance: z.coerce.number().min(0, 'Transport allowance cannot be negative').default(0),
  npsPension: z.coerce.number().min(0, 'NPS cannot be negative').default(0),
  rentOfBuilding: z.coerce.number().min(0, 'Rent cannot be negative').default(0),
  professionalTax: z.coerce.number().min(0, 'PT cannot be negative').default(0),
  gis1981Insurance: z.coerce.number().min(0, 'GIS Insurance cannot be negative').default(0),
  gis1981Savings: z.coerce.number().min(0, 'GIS Savings cannot be negative').default(0),
  societyDeduction: z.coerce.number().min(0, 'Society deduction cannot be negative').default(0),
  masterId: z.string().optional(),
});

export const gtr30PostItemSchema = z.object({
  id: z.string().min(1),
  srNo: z.string().default('1'),
  designation: z.string().default(''),
  cadreClass: z.string().default('૩'),
  sanctioned: z.coerce.number().min(0).default(1),
  filled: z.coerce.number().min(0).default(0),
  vacant: z.coerce.number().min(0).default(1),
  total: z.coerce.number().min(0).default(1),
});

export const gtr30BillSchema = z.object({
  id: z.string().optional(),
  billRegisterNo: z.string().min(1, 'Bill Register No is required'),
  billDate: z.string().min(1, 'Bill Date is required'),
  monthOf: z.string().min(1, 'Month is required'),
  billCode: z.string().min(1, 'Bill Code is required'),
  officeName: z.string().min(1, 'Office Name is required'),
  officeFullName: z.string().optional().default(''),
  treasuryName: z.string().optional().default(''),
  drawingOfficer: z.string().optional().default(''),
  drawingOfficerName: z.string().optional().default(''),
  drawingOfficerDesignation: z.string().optional().default(''),
  status: z.enum(GTR30_BILL_STATUSES).optional().default('draft'),
  employees: z.array(gtr30EmployeeSchema).min(1, 'Bill must contain at least one employee'),
  establishmentPosts: z.array(gtr30PostItemSchema).optional().default([]),
  schemeResolutionText: z.string().optional().default(''),
  daResolutionText: z.string().optional().default(''),
});

export type GTR30BillValidationResult = {
  isValid: boolean;
  errors: string[];
};

export function validateGTR30BillData(data: unknown): GTR30BillValidationResult {
  const result = gtr30BillSchema.safeParse(data);
  if (result.success) {
    return { isValid: true, errors: [] };
  }
  const errors = result.error.errors.map((e) => `${e.path.join('.') || 'root'}: ${e.message}`);
  return { isValid: false, errors };
}
