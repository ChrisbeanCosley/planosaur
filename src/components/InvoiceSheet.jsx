// The invoice drawn on the page as a paper sheet. It mirrors the PDF in
// components/pdf/InvoicePdf.jsx, so keep the two in step when changing the layout.
import { formatLongDate, fromKey } from '../utils/date';
import { invoiceStatus, invoiceTotals, lineAmount, taxLabel, termsLabel } from '../utils/invoices';
import { formatMoney } from '../utils/money';
import './InvoiceSheet.css';

const STAMPED = ['paid', 'overdue', 'draft'];

const formatDate = (key) => (key ? formatLongDate(fromKey(key)) : '—');

function Detail({ label, value }) {
  if (!value) return null;
  return (
    <div className="sheet__detail">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

export default function InvoiceSheet({ invoice, from }) {
  const totals = invoiceTotals(invoice);
  const status = invoiceStatus(invoice);
  const isEstimate = invoice.type === 'estimate';
  const balanceDue = invoice.status === 'paid' ? 0 : totals.total;

  return (
    <div className="sheet-frame">
      <article className="sheet" aria-label={`${isEstimate ? 'Estimate' : 'Invoice'} ${invoice.number}`}>
        <div className="sheet__accent" />

        <header className="sheet__header">
          <div>
            <h2 className="sheet__title">{isEstimate ? 'ESTIMATE' : 'INVOICE'}</h2>
            <div className="sheet__number">{invoice.number}</div>
          </div>
          <div className="sheet__from">
            {from.logoUrl && <img className="sheet__logo" src={from.logoUrl} alt="" />}
            <strong>{from.name}</strong>
            {from.email && <span>{from.email}</span>}
          </div>
        </header>

        {STAMPED.includes(status.tone) && (
          <div className={`sheet__stamp sheet__stamp--${status.tone}`}>{status.label}</div>
        )}

        <section className="sheet__meta">
          <div>
            <div className="sheet__label">BILL TO</div>
            <div className="sheet__client">{invoice.client}</div>
          </div>
          <div className="sheet__details">
            <Detail label={isEstimate ? 'Estimate date' : 'Invoice date'} value={formatDate(invoice.date)} />
            <Detail label={isEstimate ? 'Valid until' : 'Due date'} value={invoice.dueDate && formatDate(invoice.dueDate)} />
            <Detail label="Terms" value={termsLabel(invoice.terms)} />
            <Detail label="Order no." value={invoice.orderNumber} />
            <Detail label="Reference" value={invoice.reference} />
          </div>
        </section>

        {invoice.subject && <p className="sheet__subject">{invoice.subject}</p>}

        <table className="sheet__table">
          <thead>
            <tr>
              <th>ITEM</th>
              <th>QTY</th>
              <th>RATE</th>
              <th>TAX</th>
              <th>AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item) => (
              <tr key={item.id}>
                <td>{item.description || '—'}</td>
                <td>{Number(item.quantity) || 0}</td>
                <td>{formatMoney(item.rate)}</td>
                <td>{taxLabel(item.taxRate)}</td>
                <td>{formatMoney(lineAmount(item))}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <section className="sheet__totals">
          <div>
            <span>Sub total</span>
            <span>{formatMoney(totals.subTotal)}</span>
          </div>
          {totals.tax > 0 && (
            <div>
              <span>Tax</span>
              <span>{formatMoney(totals.tax)}</span>
            </div>
          )}
          {totals.discount > 0 && (
            <div>
              <span>Discount</span>
              <span>-{formatMoney(totals.discount)}</span>
            </div>
          )}
          <div className="sheet__grand-total">
            <span>Total</span>
            <span>{formatMoney(totals.total)}</span>
          </div>
          {!isEstimate && (
            <div className="sheet__balance">
              <span>Balance due</span>
              <span>{formatMoney(balanceDue)}</span>
            </div>
          )}
        </section>

        <footer className="sheet__footer">Thank you for your business.</footer>
      </article>
    </div>
  );
}
