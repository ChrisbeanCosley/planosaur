import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Download, Pencil } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import { useAuth } from '../context/AuthContext';
import InvoiceSheet from '../components/InvoiceSheet';
import { formatLongDate, fromKey } from '../utils/date';
import { invoiceStatus, invoiceTotals } from '../utils/invoices';
import { formatMoney } from '../utils/money';
import './InvoicePreview.css';

export default function InvoicePreview() {
  const { id } = useParams();
  const { invoices } = useAppData();
  const { sender: from } = useAuth();
  const navigate = useNavigate();
  const [downloading, setDownloading] = useState(false);

  const invoice = invoices.find((i) => i.id === id);
  if (!invoice) return <Navigate to="/invoices" replace />;

  const status = invoiceStatus(invoice);
  const { total } = invoiceTotals(invoice);

  const download = async () => {
    setDownloading(true);
    try {
      // Loaded on demand so the PDF library isn't part of the main bundle.
      const { downloadInvoicePdf } = await import('../components/pdf/downloadInvoicePdf');
      await downloadInvoicePdf(invoice, from);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="invoice-preview">
      <header className="invoice-preview__header">
        <button type="button" className="icon-button" onClick={() => navigate('/invoices')} aria-label="Back to invoices">
          <ArrowLeft size={19} strokeWidth={1.8} />
        </button>
        <div className="invoice-preview__heading">
          <h1 className="page-title">{invoice.number}</h1>
          <p>
            {invoice.client} · {formatMoney(total)}
            {invoice.dueDate && ` · Due ${formatLongDate(fromKey(invoice.dueDate))}`}
            {' · '}
            <span className={`status status--${status.tone}`}>{status.label}</span>
          </p>
        </div>
        <div className="invoice-preview__actions">
          <button type="button" className="btn btn--pink" onClick={download} disabled={downloading}>
            <Download size={15} strokeWidth={1.8} /> {downloading ? 'Preparing…' : 'Download PDF'}
          </button>
          <button type="button" className="btn" onClick={() => navigate(`/invoices/${invoice.id}/edit`)}>
            <Pencil size={15} strokeWidth={1.8} /> Edit Invoice
          </button>
        </div>
      </header>

      <InvoiceSheet invoice={invoice} from={from} />
    </div>
  );
}
