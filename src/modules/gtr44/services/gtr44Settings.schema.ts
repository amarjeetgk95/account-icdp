import { z } from 'zod';

/**
 * Explicit schema for individual fields reused in bill validation
 */
export const headChargeableCodeSchema = z.string().regex(/^\d{13}$/, 'Head Chargeable must be exactly 13 digits');
