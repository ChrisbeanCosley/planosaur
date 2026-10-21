import { diffInDays, fromKey } from './date';

export const TERMS_OPTIONS = [
  { value: '', label: 'Select terms', days: null },
  { value: 'receipt', label: 'Due on receipt', days: 0 },
  { value: 'net15', label: 'Net 15', days: 15 },
  { value: 'net30', label: 'Net 30', days: 30 },
  { value: 'net60', label: 'Net 60', days: 60 },
];

const cents = (n) => Math.round(n * 100) / 100;

// Two ways VAT can be stored:
// - invoice.vatRate set (number): one rate charged on the subtotal after discount (current invoices).
// - invoice.vatRate null: older invoices with a tax rate per line, discount taken off after tax.
export const hasInvoiceVat = (invoice) =>
  invoice.vatRate !== null && invoice.vatRate !== undefined && invoice.vatRate !== '';

export function invoiceTotals(invoice) {
  let subTotal = 0;
  let lineTax = 0;
  for (const item of invoice.items) {
    const line = (Number(item.quantity) || 0) * (Number(item.rate) || 0);
    subTotal += line;
    lineTax += line * (Number(item.taxRate) || 0);
  }
  subTotal = cents(subTotal);
  const discount = Number(invoice.discount) || 0;

  if (hasInvoiceVat(invoice)) {
    const vatRate = Number(invoice.vatRate);
    const taxable = Math.max(0, subTotal - discount);
    const tax = cents(taxable * vatRate);
    return { subTotal, discount, tax, vatRate, total: cents(taxable + tax) };
  }
  const tax = cents(lineTax);
  return { subTotal, discount, tax, vatRate: null, total: Math.max(0, cents(subTotal + tax - discount)) };
}

// Converts an older per-line-tax invoice to invoice-level VAT when it's edited.
export function withInvoiceVat(invoice) {
  if (hasInvoiceVat(invoice) || !invoice.items.some((i) => Number(i.taxRate) > 0)) return invoice;
  const rate = Math.max(...invoice.items.map((i) => Number(i.taxRate) || 0));
  return { ...invoice, vatRate: rate, items: invoice.items.map((i) => ({ ...i, taxRate: 0 })) };
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

// A line's amount before VAT (VAT is added once, in the invoice totals).
export const lineAmount = (item) => (Number(item.quantity) || 0) * (Number(item.rate) || 0);
