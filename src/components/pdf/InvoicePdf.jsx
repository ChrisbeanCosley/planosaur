// The invoice as a PDF document (A4), built with @react-pdf/renderer.
// Sizes are in PDF points (1pt = 1/72 inch), independent of the app's screen scale.
import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import { formatLongDate, fromKey } from '../../utils/date';
import { invoiceStatus, invoiceTotals, lineAmount, termsLabel } from '../../utils/invoices';
import { formatVatRate } from '../../utils/vat';
import { formatMoney } from '../../utils/money';

const PURPLE = '#8e4498';
const PINK = '#df5f9c';
const TEXT = '#4a4a4a';
const MUTED = '#8a8a8a';
const LINE = '#e5e0e6';

const styles = StyleSheet.create({
  page: { paddingTop: 48, paddingBottom: 64, paddingHorizontal: 48, fontFamily: 'Helvetica', fontSize: 10, color: TEXT },
  accent: { position: 'absolute', top: 0, left: 0, right: 0, height: 8, backgroundColor: PURPLE },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 },
  title: { fontSize: 26, fontFamily: 'Helvetica-Bold', color: PURPLE, letterSpacing: 2 },
  number: { marginTop: 4, fontSize: 11, color: MUTED },
  fromBlock: { alignItems: 'flex-end', maxWidth: 220 },
  person: { marginBottom: 2 },
  logo: { maxWidth: 180, maxHeight: 60, marginBottom: 8, objectFit: 'contain' },
  fromName: { fontSize: 13, fontFamily: 'Helvetica-Bold', marginBottom: 3 },
  muted: { color: MUTED },
  meta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  label: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: MUTED, letterSpacing: 1, marginBottom: 5 },
  client: { fontSize: 13, fontFamily: 'Helvetica-Bold' },
  details: { width: 210 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  subject: { marginBottom: 18, fontSize: 11 },
  table: { borderTopWidth: 1, borderTopColor: LINE },
  headRow: { flexDirection: 'row', paddingVertical: 8, backgroundColor: '#f8eff8' },
  row: { flexDirection: 'row', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: LINE },
  th: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: MUTED, letterSpacing: 0.5 },
  colItem: { flex: 1, paddingLeft: 8, paddingRight: 8 },
  colQty: { width: 50, textAlign: 'right' },
  colRate: { width: 80, textAlign: 'right' },
  colAmount: { width: 90, textAlign: 'right', paddingRight: 8 },
  totals: { alignSelf: 'flex-end', width: 230, marginTop: 18 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  grandTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1.5,
    borderTopColor: PURPLE,
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
  },
  balance: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, color: PINK, fontFamily: 'Helvetica-Bold' },
  // Sits in the empty space between the title and the sender, top centre.
  stamp: {
    position: 'absolute',
    top: 56,
    left: 250,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderWidth: 2,
    borderRadius: 4,
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 2,
    transform: 'rotate(-8deg)',
  },
  footer: { position: 'absolute', bottom: 32, left: 48, right: 48, textAlign: 'center', fontSize: 9, color: MUTED },
});

const STAMP_COLORS = { paid: '#5aa83a', overdue: '#d65c5c', draft: MUTED };

const formatDate = (key) => (key ? formatLongDate(fromKey(key)) : '—');

function Detail({ label, value }) {
  if (!value) return null;
  return (
    <View style={styles.detailRow}>
      <Text style={styles.muted}>{label}</Text>
      <Text>{value}</Text>
    </View>
  );
}

export default function InvoicePdf({ invoice, from }) {
  const totals = invoiceTotals(invoice);
  const status = invoiceStatus(invoice);
  const isEstimate = invoice.type === 'estimate';
  const balanceDue = invoice.status === 'paid' ? 0 : totals.total;
  const stampColor = STAMP_COLORS[status.tone];
  // Keep in step with InvoiceSheet: tax-invoice title, and VAT after discount for invoice-level VAT.
  const title = isEstimate ? 'ESTIMATE' : from.vatRegistered ? 'TAX INVOICE' : 'INVOICE';
  const vatAfterDiscount = totals.vatRate !== null;
  // Always show a VAT line (0% when there is none); older per-line tax shows as "Tax" before the discount.
  const legacyTax = !vatAfterDiscount && totals.tax > 0;
  const vatLabel = vatAfterDiscount ? `VAT (${formatVatRate(totals.vatRate)})` : legacyTax ? 'Tax' : 'VAT (0%)';
  const vatRow = (
    <View style={styles.totalRow}>
      <Text style={styles.muted}>{vatLabel}</Text>
      <Text>{formatMoney(totals.tax)}</Text>
    </View>
  );

  return (
    <Document title={`${invoice.number} - ${invoice.client}`} author={from.company || from.name} creator="Planosaur">
      <Page size="A4" style={styles.page}>
        <View style={styles.accent} fixed />

        <View style={styles.header}>
          <View>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.number}>{invoice.number}</Text>
          </View>
          <View style={styles.fromBlock}>
            {from.logoUrl && <Image style={styles.logo} src={from.logoUrl} />}
            {/* With a company name, that leads and the person's name sits under it. */}
            <Text style={styles.fromName}>{from.company || from.name}</Text>
            {from.company && from.name && <Text style={styles.person}>{from.name}</Text>}
            {from.email && <Text style={styles.muted}>{from.email}</Text>}
            {from.vatNumber && <Text style={styles.muted}>VAT no. {from.vatNumber}</Text>}
          </View>
        </View>

        {stampColor && <Text style={[styles.stamp, { color: stampColor, borderColor: stampColor }]}>{status.label}</Text>}

        <View style={styles.meta}>
          <View>
            <Text style={styles.label}>BILL TO</Text>
            <Text style={styles.client}>{invoice.client}</Text>
          </View>
          <View style={styles.details}>
            <Detail label={isEstimate ? 'Estimate date' : 'Invoice date'} value={formatDate(invoice.date)} />
            <Detail label={isEstimate ? 'Valid until' : 'Due date'} value={invoice.dueDate && formatDate(invoice.dueDate)} />
            <Detail label="Terms" value={termsLabel(invoice.terms)} />
            <Detail label="Order no." value={invoice.orderNumber} />
            <Detail label="Reference" value={invoice.reference} />
          </View>
        </View>

        {invoice.subject && <Text style={styles.subject}>{invoice.subject}</Text>}

        <View style={styles.table}>
          <View style={styles.headRow} fixed>
            <Text style={[styles.th, styles.colItem]}>ITEM</Text>
            <Text style={[styles.th, styles.colQty]}>QTY</Text>
            <Text style={[styles.th, styles.colRate]}>RATE</Text>
            <Text style={[styles.th, styles.colAmount]}>AMOUNT</Text>
          </View>
          {invoice.items.map((item) => (
            <View key={item.id} style={styles.row} wrap={false}>
              <Text style={styles.colItem}>{item.description || '—'}</Text>
              <Text style={styles.colQty}>{Number(item.quantity) || 0}</Text>
              <Text style={styles.colRate}>{formatMoney(item.rate)}</Text>
              <Text style={styles.colAmount}>{formatMoney(lineAmount(item))}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totals} wrap={false}>
          <View style={styles.totalRow}>
            <Text style={styles.muted}>Sub total</Text>
            <Text>{formatMoney(totals.subTotal)}</Text>
          </View>
          {legacyTax && vatRow}
          {totals.discount > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.muted}>Discount</Text>
              <Text>-{formatMoney(totals.discount)}</Text>
            </View>
          )}
          {!legacyTax && vatRow}
          <View style={styles.grandTotal}>
            <Text>Total</Text>
            <Text>{formatMoney(totals.total)}</Text>
          </View>
          {!isEstimate && (
            <View style={styles.balance}>
              <Text>Balance due</Text>
              <Text>{formatMoney(balanceDue)}</Text>
            </View>
          )}
        </View>

        <Text style={styles.footer} fixed>
          Thank you for your business.
        </Text>
      </Page>
    </Document>
  );
}
