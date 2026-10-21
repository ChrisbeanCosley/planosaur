// VAT helpers shared by sign-up, Settings and invoices. Rates are fractions (0.15 = 15%).
// A profile's vatRate is a number, or 'variable' when it's chosen per invoice.

export const STANDARD_VAT = 0.15; // South Africa's standard rate

export const VARIABLE = 'variable';

// 0.15 -> "15%", 0.075 -> "7.5%"
export const formatVatRate = (rate) => `${Number((Number(rate) * 100).toFixed(2))}%`;

// "7.5" (percent typed by a person) -> 0.075, or null when it isn't a valid 0–100 number.
export function percentToRate(text) {
  const n = Number(String(text).replace('%', '').trim());
  if (text === '' || !Number.isFinite(n) || n < 0 || n > 100) return null;
  return Math.round(n * 100) / 10000;
}

// The rates offered on an invoice: standard, zero-rated, plus the person's own rate if different.
export function vatOptions(profileRate) {
  const options = [
    { value: STANDARD_VAT, label: `${formatVatRate(STANDARD_VAT)} (standard)` },
    { value: 0, label: '0% (zero-rated)' },
  ];
  if (typeof profileRate === 'number' && !options.some((o) => o.value === profileRate)) {
    options.unshift({ value: profileRate, label: `${formatVatRate(profileRate)} (your rate)` });
  }
  return options;
}

// What a new invoice's VAT starts as: null (not registered), '' (variable: must be chosen), or the rate.
export function defaultInvoiceVat({ vatRegistered, vatRate }) {
  if (!vatRegistered) return null;
  if (vatRate === VARIABLE || vatRate === null || vatRate === undefined) return '';
  return vatRate;
}
