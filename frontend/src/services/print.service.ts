import type { Order } from './order.service';

export interface PrintableCompanyInfo {
  siteName: string;
  siteLogo?: string;
  siteEmail?: string;
  sitePhone?: string;
  siteAddress?: string;
}

interface PrintableInvoiceItem {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface PrintableInvoiceData {
  invoiceNumber: string;
  sourceLabel: string;
  statusLabel: string;
  issuedAt: string;
  dueDate?: string;
  subtotal: number;
  tax: number;
  totalAmount: number;
  notes?: string;
  reference?: string;
  items?: PrintableInvoiceItem[];
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(value?: string): string {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function formatPrice(value: number): string {
  return `${value.toFixed(2)} DT`;
}

function writeHtmlInPrintWindow(win: Window, title: string, bodyHtml: string): void {
  win.document.title = title;

  const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(title)}</title>
<style>
  :root {
    --ink: #0f172a;
    --muted: #64748b;
    --line: #e2e8f0;
    --brand: #0f766e;
    --bg: #f8fafc;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
    color: var(--ink);
    background: var(--bg);
    padding: 28px;
  }
  .sheet {
    max-width: 900px;
    margin: 0 auto;
    background: #fff;
    border: 1px solid var(--line);
    border-radius: 16px;
    overflow: hidden;
  }
  .head {
    background: linear-gradient(135deg, #134e4a 0%, #0f766e 100%);
    color: #fff;
    padding: 22px 26px;
    display: flex;
    justify-content: space-between;
    gap: 16px;
    align-items: center;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .brand-logo {
    width: 42px;
    height: 42px;
    border-radius: 10px;
    background: rgba(255,255,255,0.18);
    object-fit: contain;
    padding: 4px;
  }
  .head h1 {
    margin: 0;
    font-size: 22px;
    font-weight: 700;
    letter-spacing: 0.2px;
  }
  .meta {
    text-align: right;
    font-size: 13px;
    line-height: 1.7;
    opacity: 0.95;
  }
  .section {
    padding: 18px 26px;
    border-bottom: 1px solid var(--line);
  }
  .label {
    color: var(--muted);
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-bottom: 6px;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 14px;
  }
  .card {
    border: 1px solid var(--line);
    border-radius: 12px;
    padding: 12px;
    background: #fff;
  }
  .card .v {
    font-size: 14px;
    font-weight: 600;
  }
  table {
    width: 100%;
    border-collapse: collapse;
  }
  th, td {
    border-bottom: 1px solid var(--line);
    padding: 10px 6px;
    text-align: left;
    font-size: 13px;
  }
  th {
    color: var(--muted);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    font-size: 11px;
  }
  td.r, th.r { text-align: right; }
  .totals {
    width: 320px;
    margin-left: auto;
    margin-top: 14px;
  }
  .totals .row {
    display: flex;
    justify-content: space-between;
    padding: 6px 0;
    font-size: 14px;
  }
  .totals .grand {
    margin-top: 4px;
    padding-top: 10px;
    border-top: 2px solid var(--line);
    font-weight: 800;
    font-size: 16px;
  }
  .note {
    font-size: 13px;
    color: #334155;
    white-space: pre-wrap;
  }
  @media print {
    body { background: #fff; padding: 0; }
    .sheet { border: none; border-radius: 0; }
  }
</style>
</head>
<body>
  ${bodyHtml}
  <script>
    window.onload = function () {
      window.print();
      window.onafterprint = function () { window.close(); };
    };
  </script>
</body>
</html>`;

  win.document.open();
  win.document.write(html);
  win.document.close();
}

export function openPrintPreviewWindow(loadingTitle = 'Préparation de l\'impression...'): Window | null {
  const win = window.open('', '_blank', 'width=980,height=760');
  if (!win) {
    return null;
  }

  win.document.open();
  win.document.write(`<!doctype html><html lang="fr"><head><meta charset="UTF-8" /><title>${escapeHtml(loadingTitle)}</title></head><body style="font-family:Segoe UI,Tahoma,sans-serif;padding:24px;color:#334155">${escapeHtml(loadingTitle)}</body></html>`);
  win.document.close();
  return win;
}

function openPrintWindow(title: string, bodyHtml: string, targetWindow?: Window | null): void {
  const win = targetWindow || openPrintPreviewWindow(title);
  if (!win) {
    throw new Error('Popup blocked');
  }

  writeHtmlInPrintWindow(win, title, bodyHtml);
}

function buildCompanyHeader(company?: PrintableCompanyInfo): string {
  const name = company?.siteName || 'Assiette Gala';
  const logo = company?.siteLogo
    ? `<img class="brand-logo" src="${escapeHtml(company.siteLogo)}" alt="${escapeHtml(name)}" />`
    : '';
  const email = company?.siteEmail ? `<div>Email: ${escapeHtml(company.siteEmail)}</div>` : '';
  const phone = company?.sitePhone ? `<div>Tél: ${escapeHtml(company.sitePhone)}</div>` : '';
  const address = company?.siteAddress ? `<div>${escapeHtml(company.siteAddress)}</div>` : '';

  return `
    <div class="brand">
      ${logo}
      <div>
        <h1>${escapeHtml(name)}</h1>
        <div style="margin-top:2px;font-size:12px;opacity:0.9">Document client</div>
      </div>
    </div>
    <div class="meta">
      ${email}
      ${phone}
      ${address}
    </div>
  `;
}

export function printOrder(order: Order, targetWindow?: Window | null, company?: PrintableCompanyInfo): void {
  const orderNumber = order.orderNumber || order.id.slice(-6).toUpperCase();
  const rows = (order.items || [])
    .map((item) => {
      const total = item.unitPrice * item.quantity;
      return `<tr>
        <td>${escapeHtml(item.platName)}</td>
        <td class="r">${item.quantity}</td>
        <td class="r">${formatPrice(item.unitPrice)}</td>
        <td class="r">${formatPrice(total)}</td>
      </tr>`;
    })
    .join('');

  const body = `<div class="sheet">
    <div class="head">
      ${buildCompanyHeader(company)}
    </div>

    <div class="section" style="background:#f8fafc">
      <div class="grid">
        <div class="card">
          <div class="label">Document</div>
          <div class="v">Bon de commande</div>
        </div>
        <div class="card">
          <div class="label">Numéro</div>
          <div class="v">#${escapeHtml(orderNumber)}</div>
        </div>
        <div class="card">
          <div class="label">Date</div>
          <div class="v">${formatDate(order.createdAt)}</div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="grid">
        <div class="card">
          <div class="label">Adresse de livraison</div>
          <div class="v">${escapeHtml(order.deliveryAddress?.street || '-')}</div>
          <div style="margin-top:4px;color:#475569;font-size:13px">${escapeHtml(`${order.deliveryAddress?.zipCode || ''} ${order.deliveryAddress?.city || ''}`.trim() || '-')}</div>
        </div>
        <div class="card">
          <div class="label">Créneau</div>
          <div class="v">${escapeHtml(order.deliverySlot || formatDate(order.deliveryDate))}</div>
        </div>
        <div class="card">
          <div class="label">Articles</div>
          <div class="v">${(order.items || []).length}</div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="label">Détail des articles</div>
      <table>
        <thead>
          <tr>
            <th>Article</th>
            <th class="r">Qté</th>
            <th class="r">Prix unitaire</th>
            <th class="r">Total</th>
          </tr>
        </thead>
        <tbody>${rows || '<tr><td colspan="4">Aucun article</td></tr>'}</tbody>
      </table>

      <div class="totals">
        <div class="row"><span>Sous-total</span><strong>${formatPrice(order.subtotal)}</strong></div>
        <div class="row"><span>Livraison</span><strong>${formatPrice(order.deliveryFee)}</strong></div>
        <div class="row"><span>TVA</span><strong>${formatPrice(order.tax)}</strong></div>
        <div class="row grand"><span>Total</span><span>${formatPrice(order.totalAmount)}</span></div>
      </div>
    </div>

    ${order.notes ? `<div class="section"><div class="label">Notes</div><div class="note">${escapeHtml(order.notes)}</div></div>` : ''}
  </div>`;

  openPrintWindow(`Commande ${orderNumber}`, body, targetWindow);
}

export function printInvoice(
  invoice: PrintableInvoiceData,
  targetWindow?: Window | null,
  company?: PrintableCompanyInfo
): void {
  const isEventInvoice = invoice.sourceLabel.toLowerCase().includes('événement');
  const rows = (invoice.items || [])
    .map((item) => `<tr>
      <td>${escapeHtml(item.name)}</td>
      <td class="r">${item.quantity}</td>
      <td class="r">${formatPrice(item.unitPrice)}</td>
      <td class="r">${formatPrice(item.totalPrice)}</td>
    </tr>`)
    .join('');

  const body = `<div class="sheet">
    <div class="head">
      ${buildCompanyHeader(company)}
    </div>

    <div class="section" style="background:#f8fafc">
      <div class="grid">
        <div class="card">
          <div class="label">Document</div>
          <div class="v">Facture client</div>
        </div>
        <div class="card">
          <div class="label">Numéro</div>
          <div class="v">${escapeHtml(invoice.invoiceNumber)}</div>
        </div>
        <div class="card">
          <div class="label">Émise le</div>
          <div class="v">${formatDate(invoice.issuedAt)}</div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="grid">
        ${
          isEventInvoice
            ? `
              <div class="card">
                <div class="label">Référence</div>
                <div class="v">${escapeHtml(invoice.reference || '-')}</div>
              </div>
              <div class="card">
                <div class="label">Statut</div>
                <div class="v">${escapeHtml(invoice.statusLabel)}</div>
              </div>
              <div class="card">
                <div class="label">Échéance</div>
                <div class="v">${formatDate(invoice.dueDate)}</div>
              </div>
            `
            : `
              <div class="card">
                <div class="label">Source</div>
                <div class="v">${escapeHtml(invoice.sourceLabel)}</div>
              </div>
              <div class="card">
                <div class="label">Référence</div>
                <div class="v">${escapeHtml(invoice.reference || '-')}</div>
              </div>
              <div class="card">
                <div class="label">Type</div>
                <div class="v">${escapeHtml(invoice.statusLabel)}</div>
              </div>
            `
        }
      </div>
    </div>

    <div class="section">
      <div class="label">Détail</div>
      ${rows ? `<table>
        <thead>
          <tr>
            <th>Article</th>
            <th class="r">Qté</th>
            <th class="r">Prix unitaire</th>
            <th class="r">Total</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>` : '<div class="note">Aucun détail article disponible pour cette facture.</div>'}

      <div class="totals">
        <div class="row"><span>Sous-total</span><strong>${formatPrice(invoice.subtotal)}</strong></div>
        <div class="row"><span>TVA</span><strong>${formatPrice(invoice.tax)}</strong></div>
        <div class="row grand"><span>Total</span><span>${formatPrice(invoice.totalAmount)}</span></div>
      </div>
    </div>

    ${invoice.notes ? `<div class="section"><div class="label">Notes</div><div class="note">${escapeHtml(invoice.notes)}</div></div>` : ''}
  </div>`;

  openPrintWindow(`Facture ${invoice.invoiceNumber}`, body, targetWindow);
}
