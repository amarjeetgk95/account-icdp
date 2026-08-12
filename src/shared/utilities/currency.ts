/**
 * Financial Calculation Precision Utilities for ICDP Modern Tax System
 *
 * Avoids binary floating point rounding errors (e.g. 0.1 + 0.2 = 0.30000000000000004)
 * by performing monetary calculations in integer paise (1 Rupee = 100 Paise).
 */

/**
 * Converts a rupee amount to integer paise.
 */
export function toPaise(rupees: number): number {
  if (isNaN(rupees) || !isFinite(rupees)) return 0;
  return Math.round(rupees * 100);
}

/**
 * Converts integer paise back to rupees rounded to 2 decimal places.
 */
export function toRupees(paise: number): number {
  if (isNaN(paise) || !isFinite(paise)) return 0;
  return Math.round(paise) / 100;
}

/**
 * Adds multiple currency amounts with exact precision.
 */
export function addCurrency(...amounts: number[]): number {
  const totalPaise = amounts.reduce((sum, amount) => sum + toPaise(amount), 0);
  return toRupees(totalPaise);
}

/**
 * Subtracts b from a with exact precision.
 */
export function subtractCurrency(a: number, b: number): number {
  return toRupees(toPaise(a) - toPaise(b));
}

/**
 * Multiplies a currency amount by a factor (e.g. tax percentage rate) with exact rounding.
 */
export function multiplyCurrency(amount: number, factor: number): number {
  const paise = toPaise(amount);
  return toRupees(Math.round(paise * factor));
}

/**
 * Calculates a percentage rate of a currency amount cleanly (e.g. 18% GST or 10% TDS).
 */
export function calculateTaxRate(amount: number, percentageRate: number): number {
  if (percentageRate <= 0) return 0;
  return multiplyCurrency(amount, percentageRate / 100);
}
