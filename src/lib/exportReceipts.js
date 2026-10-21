// Bundles a month's expense receipts into one zip, plus a CSV summary for VAT / the accountant.
// Runs entirely in the browser: each file is downloaded from storage, then zipped with fflate.
import { strToU8, zipSync } from 'fflate';
import { EXPENSE_CATEGORIES } from '../data/categories';
import { downloadReceipt } from './api';

// "Adobe Systems (Pty) Ltd" -> "Adobe-Systems-Pty-Ltd"; keeps names safe on Windows and macOS.
const slug = (text) =>
  text
    .normalize('NFKD')
    .replace(/[^\w\s.-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 40) || 'expense';

// Like slug, but keeps the file extension even when the name is long.
function safeFileName(name) {
  const dot = name.lastIndexOf('.');
  if (dot <= 0) return slug(name);
  return `${slug(name.slice(0, dot))}${name.slice(dot).toLowerCase().replace(/[^.\w]/g, '')}`;
}

const csvCell = (value) => {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

// Gives each file a unique name inside the zip by adding (2), (3), ... when needed.
function uniqueName(name, used) {
  if (!used.has(name)) {
    used.add(name);
    return name;
  }
  const dot = name.lastIndexOf('.');
  const [base, ext] = dot > 0 ? [name.slice(0, dot), name.slice(dot)] : [name, ''];
  let n = 2;
  while (used.has(`${base} (${n})${ext}`)) n += 1;
  const unique = `${base} (${n})${ext}`;
  used.add(unique);
  return unique;
}

// What's in a month, before downloading anything (used for the dialog's summary).
export function monthSummary(month, expenses, receipts) {
  const monthExpenses = expenses.filter((e) => e.date.startsWith(month)).sort((a, b) => a.date.localeCompare(b.date));
  const byExpense = new Map(monthExpenses.map((e) => [e.id, []]));
  receipts.forEach((r) => byExpense.get(r.expenseId)?.push(r));
  const missing = monthExpenses.filter((e) => byExpense.get(e.id).length === 0);
  const receiptCount = [...byExpense.values()].reduce((n, list) => n + list.length, 0);
  return { monthExpenses, byExpense, missing, receiptCount };
}

/**
 * Builds the zip for `month` ("YYYY-MM"). onProgress(done, total) is called as files download.
 * Returns { blob, fileName }.
 */
export async function buildReceiptsZip(month, expenses, receipts, onProgress = () => {}) {
  const { monthExpenses, byExpense, receiptCount } = monthSummary(month, expenses, receipts);
  const files = {};
  const used = new Set();
  const namesByExpense = new Map();
  let done = 0;
  onProgress(0, receiptCount);

  for (const expense of monthExpenses) {
    const names = [];
    for (const receipt of byExpense.get(expense.id)) {
      let blob;
      try {
        blob = await downloadReceipt(receipt.path);
      } catch (err) {
        throw new Error(`Couldn't download ${receipt.fileName} (${expense.payee}): ${err.message}`);
      }
      const name = uniqueName(
        `${expense.date}_${slug(expense.payee)}_R${expense.amount.toFixed(2)}_${safeFileName(receipt.fileName)}`,
        used,
      );
      // Photos and PDFs are already compressed, so store them as-is (much faster).
      files[`receipts/${name}`] = [new Uint8Array(await blob.arrayBuffer()), { level: 0 }];
      names.push(name);
      done += 1;
      onProgress(done, receiptCount);
    }
    namesByExpense.set(expense.id, names);
  }

  const total = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
  const rows = [
    ['Date', 'Paid to', 'Description', 'Category', 'Amount (R)', 'Receipt files', 'Status'],
    ...monthExpenses.map((e) => {
      const names = namesByExpense.get(e.id);
      return [
        e.date,
        e.payee,
        e.description,
        EXPENSE_CATEGORIES[e.category]?.label ?? e.category,
        e.amount.toFixed(2),
        names.join('; '),
        names.length ? 'Receipt attached' : 'MISSING RECEIPT',
      ];
    }),
    [],
    ['', '', '', 'Total', total.toFixed(2), '', ''],
  ];
  // The BOM makes Excel read the file as UTF-8 (so names with accents survive).
  const csv = `﻿${rows.map((row) => row.map(csvCell).join(',')).join('\r\n')}`;
  files[`expenses-${month}.csv`] = strToU8(csv);

  const zipped = zipSync(files);
  return { blob: new Blob([zipped], { type: 'application/zip' }), fileName: `Planosaur-receipts-${month}.zip` };
}
