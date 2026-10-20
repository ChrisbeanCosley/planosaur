// Everything that touches @react-pdf/renderer lives behind this module, which the app
// imports on demand so the PDF library only downloads when someone saves a PDF.
import { pdf } from '@react-pdf/renderer';
import InvoicePdf from './InvoicePdf';

export async function downloadInvoicePdf(invoice, from) {
  const blob = await pdf(<InvoicePdf invoice={invoice} from={from} />).toBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${invoice.number}.pdf`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
