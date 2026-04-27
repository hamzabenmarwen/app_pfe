import crypto from 'crypto';

/**
 * Generate a unique invoice number with collision resistance.
 * Format: INV-YYYYMM-<6 hex chars>
 */
export function generateInvoiceNumber(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const random = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `INV-${year}${month}-${random}`;
}

/**
 * Generate a unique order number with collision resistance.
 * Format: ORD-YYMMDD-<8 hex chars>
 */
export function generateOrderNumber(): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const random = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `ORD-${year}${month}${day}-${random}`;
}
