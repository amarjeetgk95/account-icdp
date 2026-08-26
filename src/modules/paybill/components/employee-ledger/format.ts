/** Currency formatting shared across the ledger UI (₹ + en-IN rounding). */
export const formatInr = (n: number | undefined) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;
