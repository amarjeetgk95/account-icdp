import { componentMasterService } from '../componentMaster.service';
import type { DetectedColumns } from './types';

/**
 * Detect allowance columns present in the table header
 */
export function detectAllowanceColumns(text: string): DetectedColumns {
  const hasSpecialPay = /Special\s+Additional\s+Pay|Special\s+Pay/i.test(text);
  const hasWashing = /Washing\s+Allow|\(0132\)/i.test(text);
  const hasNpp = /Non\s+Private\s+Practice|\(0128\)|NPP/i.test(text);

  // Standard 6: Basic, DA, HRA, CLA, Med, Trans
  // + Special Pay (1) + Washing (1) + NPP (1) + Gross (1)
  let columnCount = 7; // 6 standard + 1 gross
  if (hasSpecialPay) columnCount++;
  if (hasWashing) columnCount++;
  if (hasNpp) columnCount++;

  return {
    hasSpecialPay,
    hasWashing,
    hasNpp,
    columnCount,
    components: componentMasterService.detectHeaderComponents(text, 'EARNING'),
  };
}
