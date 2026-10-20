import { diffInDays, fromKey } from './date';

export const TAX_OPTIONS = [
  { value: 0, label: 'No Tax' },
  { value: 0.15, label: 'VAT (15%)' },
];

export const TERMS_OPTIONS = [
  { value: '', label: 'Select terms', days: null },
  { value: 'receipt', label: 'Due on receipt', days: 0 },
  { value: 'net15', label: 'Net 15', days: 15 },
  { value: 'net30', label: 'Net 30', days: 30 },
  { value: 'net60', label: 'Net 60', days: 60 },
];

export function invoiceTotals(invoice) {
  let subTotal = 0;
  let tax = 0;
  for (const item of invoice.items) {
    const line = (Number(item.quantity) || 0) * (Number(item.rate) || 0);
    subTotal += line;
    tax += line * (Number(item.taxRate) || 0);
  }
  const discount = Number(invoice.discount) || 0;
  return { subTotal, tax, discount, total: Math.max(0, subTotal + tax - discount) };
}

export const isOpen = (invoice) =>
  invoice.type === 'invoice' && !invoice.archived && (invoice.status === 'unpaid' || invoice.status === 'pending');

export const balanceDue = (invoice) => (invoice.status === 'paid' ? 0 : invoiceTotals(invoice).total);

export const daysUntilDue = (invoice, today = new Date()) =>
  invoice.dueDate ? diffInDays(fromKey(invoice.dueDate), today) : null;

export function invoiceStatus(invoice, today = new Date()) {
  if (invoice.status === 'draft') return { label: 'DRAFT', tone: 'draft' };
  if (invoice.status === 'paid') return { label: 'PAID', tone: 'paid' };
  const days = daysUntilDue(invoice, today);
  if (days !== null) {
    if (days < 0) return { label: 'OVERDUE', tone: 'overdue' };
    if (days === 0) return { label: 'DUE TODAY', tone: 'due' };
    if (days <= 7) return { label: `DUE IN ${days} DAY${days === 1 ? '' : 'S'}`, tone: 'due' };
  }
  if (invoice.status === 'pending') return { label: 'PENDING', tone: 'pending' };
  return { label: 'UNPAID', tone: 'unpaid' };
}

export function nextInvoiceNumber(invoices) {
  const max = invoices.reduce((highest, inv) => {
    const n = Number(inv.number.replace(/\D/g, ''));
    return Number.isFinite(n) ? Math.max(highest, n) : highest;
  }, 0);
  return `INV-${String(max + 1).padStart(5, '0')}`;
}

// Display helpers shared by the on-screen invoice and the PDF.
export const termsLabel = (value) => TERMS_OPTIONS.find((t) => t.value === value && t.days !== null)?.label;

export const taxLabel = (rate) => (Number(rate) > 0 ? `${Math.round(Number(rate) * 100)}%` : '—');

export const lineAmount = (item) =>
  (Number(item.quantity) || 0) * (Number(item.rate) || 0) * (1 + (Number(item.taxRate) || 0));
