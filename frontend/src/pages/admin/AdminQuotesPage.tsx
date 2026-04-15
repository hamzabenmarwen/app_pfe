import { useState, useEffect } from 'react';
import { EyeIcon, BanknotesIcon, PrinterIcon } from '@heroicons/react/24/outline';
import { eventService } from '@/services/event.service';
import { LoadingSpinner, Badge, Button, Modal } from '@/components/ui';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { useSiteStore } from '@/stores/site.store';



interface Quote {
  id: string;
  quoteNumber: string;
  eventId: string;
  event?: {
    name: string;
    eventType: string;
    guestCount: number;
    eventDate?: string;
    venue?: { address?: string; city?: string };
  };
  status: string;
  subtotal: number;
  serviceFee: number;
  deliveryFee: number;
  tax: number;
  discount: number;
  totalAmount: number;
  validUntil: string;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  createdAt: string;
}

// Sanitize text for safe HTML insertion
function sanitize(str: string | undefined | null): string {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildQuotePrintHTML(quote: Quote, siteName: string): string {
  const event = quote.event;
  const eventTypeLabels: Record<string, string> = {
    WEDDING: 'Mariage', BIRTHDAY: 'Anniversaire', CORPORATE: 'Corporate', OTHER: 'Autre',
  };
  const eventType = eventTypeLabels[event?.eventType || ''] || event?.eventType || '-';
  const statusLabels: Record<string, string> = {
    DRAFT: 'Brouillon', SENT: 'Envoyé', ACCEPTED: 'Accepté', REJECTED: 'Refusé', EXPIRED: 'Expiré',
  };

  return `<!DOCTYPE html><html lang="fr"><head>
    <meta charset="UTF-8">
    <title>Devis ${sanitize(quote.quoteNumber)}</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Segoe UI', Tahoma, sans-serif; padding: 30px; max-width: 800px; margin: 0 auto; color: #333; }
      .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 25px; padding-bottom: 15px; border-bottom: 3px solid #b5854b; }
      .logo { font-size: 26px; font-weight: 700; color: #b5854b; }
      .logo-sub { font-size: 11px; color: #888; margin-top: 4px; }
      .doc-type { font-size: 22px; color: #333; font-weight: 600; text-align: right; }
      .doc-number { font-size: 12px; color: #888; margin-top: 6px; text-align: right; }
      .validity { font-size: 11px; color: #b5854b; font-weight: 600; text-align: right; margin-top: 4px; }
      .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 25px; }
      .meta-block { padding: 15px; background: #fafaf8; border-radius: 8px; border: 1px solid #eee; }
      .meta-block h3 { font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #b5854b; margin-bottom: 8px; font-weight: 600; }
      .meta-block p { font-size: 13px; color: #555; line-height: 1.6; }
      .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
      .items-table th { text-align: left; padding: 10px 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #888; border-bottom: 2px solid #b5854b; font-weight: 600; }
      .items-table td { padding: 10px 12px; font-size: 13px; border-bottom: 1px solid #f0f0f0; }
      .total-section { margin-top: 15px; text-align: right; }
      .total-row { display: flex; justify-content: flex-end; gap: 30px; padding: 4px 0; font-size: 13px; color: #666; }
      .total-row.grand { border-top: 2px solid #333; padding-top: 10px; margin-top: 8px; font-size: 16px; font-weight: 700; color: #333; }
      .conditions { margin-top: 30px; padding: 15px; background: #f8f8f5; border-radius: 8px; border: 1px solid #eee; }
      .conditions h4 { font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #b5854b; margin-bottom: 8px; }
      .conditions p { font-size: 11px; color: #888; line-height: 1.6; }
      .footer { margin-top: 40px; padding-top: 15px; border-top: 1px solid #eee; text-align: center; font-size: 11px; color: #aaa; }
      .signature { margin-top: 30px; display: flex; justify-content: space-between; }
      .signature-block { width: 45%; }
      .signature-block h5 { font-size: 12px; color: #666; margin-bottom: 40px; }
      .signature-line { border-top: 1px solid #ccc; padding-top: 5px; font-size: 11px; color: #888; }
      @media print { body { padding: 15px; } }
    </style>
  </head><body>
    <div class="header">
      <div>
        <div class="logo">🍽️ ${sanitize(siteName)}</div>
        <div class="logo-sub">Plateforme de gestion pour traiteurs — Tunisie</div>
      </div>
      <div>
        <div class="doc-type">DEVIS</div>
        <div class="doc-number">${sanitize(quote.quoteNumber)}</div>
        <div class="validity">Valide jusqu'au ${new Date(quote.validUntil).toLocaleDateString('fr-FR')}</div>
      </div>
    </div>

    <div class="meta-grid">
      <div class="meta-block">
        <h3>Événement</h3>
        <p><strong>Nom :</strong> ${sanitize(event?.name)}</p>
        <p><strong>Type :</strong> ${sanitize(eventType)}</p>
        <p><strong>Date :</strong> ${event?.eventDate ? new Date(event.eventDate).toLocaleDateString('fr-FR') : '-'}</p>
        <p><strong>Convives :</strong> ${event?.guestCount || '-'} personnes</p>
      </div>
      <div class="meta-block">
        <h3>Informations</h3>
        <p><strong>Date d'émission :</strong> ${new Date(quote.createdAt).toLocaleDateString('fr-FR')}</p>
        <p><strong>Statut :</strong> ${sanitize(statusLabels[quote.status] || quote.status)}</p>
        ${event?.venue ? `<p><strong>Lieu :</strong> ${sanitize(event.venue.address || '')} ${sanitize(event.venue.city || '')}</p>` : ''}
      </div>
    </div>

    <table class="items-table">
      <thead><tr><th>Prestation</th><th style="text-align:center">Qté</th><th style="text-align:right">Prix unit.</th><th style="text-align:right">Total</th></tr></thead>
      <tbody>
        ${(quote.items || []).map((item) => `
          <tr>
            <td>${sanitize(item.name)}</td>
            <td style="text-align:center">${item.quantity}</td>
            <td style="text-align:right">${Number(item.unitPrice).toFixed(2)} DT</td>
            <td style="text-align:right">${Number(item.totalPrice).toFixed(2)} DT</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="total-section">
      <div class="total-row"><span>Sous-total :</span><span>${(quote.subtotal || 0).toFixed(2)} DT</span></div>
      ${quote.serviceFee > 0 ? `<div class="total-row"><span>Frais de service :</span><span>${quote.serviceFee.toFixed(2)} DT</span></div>` : ''}
      ${quote.deliveryFee > 0 ? `<div class="total-row"><span>Livraison :</span><span>${quote.deliveryFee.toFixed(2)} DT</span></div>` : ''}
      <div class="total-row"><span>TVA (19%) :</span><span>${(quote.tax || 0).toFixed(2)} DT</span></div>
      ${quote.discount > 0 ? `<div class="total-row"><span>Remise :</span><span>-${quote.discount.toFixed(2)} DT</span></div>` : ''}
      <div class="total-row grand"><span>TOTAL TTC :</span><span>${quote.totalAmount.toFixed(2)} DT</span></div>
    </div>

    <div class="conditions">
      <h4>Conditions</h4>
      <p>• Ce devis est valable jusqu'au ${new Date(quote.validUntil).toLocaleDateString('fr-FR')}.</p>
      <p>• Un acompte de 30% est demandé à la confirmation.</p>
      <p>• Le solde est dû le jour de l'événement.</p>
      <p>• Toute modification du nombre de convives doit être signalée 48h à l'avance.</p>
    </div>

    <div class="signature">
      <div class="signature-block">
        <h5>Pour ${sanitize(siteName)} :</h5>
        <div class="signature-line">Signature et cachet</div>
      </div>
      <div class="signature-block">
        <h5>Le client :</h5>
        <div class="signature-line">Lu et approuvé, signature</div>
      </div>
    </div>

    <div class="footer">
      ${sanitize(siteName)} — Plateforme Traiteur Intelligente · Merci pour votre confiance !
    </div>
  </body></html>`;
}

export default function AdminQuotesPage() {
  const { config } = useSiteStore();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    loadQuotes();
  }, []);

  const loadQuotes = async () => {
    try {
      const response = await eventService.getAllQuotes();
      setQuotes(response.data || []);
    } catch (error) {
      toast.error('Erreur lors du chargement des devis');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'info' | 'success' | 'warning' | 'error'> = {
      DRAFT: 'default',
      SENT: 'info',
      ACCEPTED: 'success',
      REJECTED: 'error',
      EXPIRED: 'warning',
    };
    const labels: Record<string, string> = {
      DRAFT: 'Brouillon',
      SENT: 'Envoyé',
      ACCEPTED: 'Accepté',
      REJECTED: 'Refusé',
      EXPIRED: 'Expiré',
    };
    return <Badge variant={variants[status] || 'default'}>{labels[status] || status}</Badge>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatPrice = (price: number) => {
    return price.toFixed(2) + ' DT';
  };

  const printQuote = (quote: Quote) => {
    const content = buildQuotePrintHTML(quote, config.siteName);
    const w = window.open('', '_blank', 'width=850,height=700');
    if (w) { w.document.write(content); w.document.close(); setTimeout(() => w.print(), 300); }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-medium text-gray-900/90">Devis</h1>
          <p className="text-gray-400 mt-1">Gérez les devis pour les événements</p>
        </motion.div>
      </div>

      {/* Quotes Table */}
      {quotes.length === 0 ? (
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-12 text-center shadow-none border border-gray-200">
          <BanknotesIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-400">Aucun devis pour le moment</p>
          <p className="text-sm text-gray-400 mt-2">
            Les devis apparaîtront ici lorsque des événements seront créés
          </p>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card overflow-hidden">
          <table className="min-w-full divide-y divide-gray-100/60">
            <thead className="bg-transparent/60">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  N° Devis
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Événement
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Montant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Valide jusqu'au
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-transparent divide-y divide-gray-100">
              {quotes.map((quote) => (
                <tr key={quote.id} className="hover:bg-primary-500/10">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-medium text-gray-900">{quote.quoteNumber}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                    {quote.event?.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatPrice(quote.totalAmount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                    {formatDate(quote.validUntil)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(quote.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => printQuote(quote)}
                        title="Imprimer le devis"
                      >
                        <PrinterIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setSelectedQuote(quote); setIsModalOpen(true); }}
                      >
                        <EyeIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      )}

      {/* Quote Details Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`Devis ${selectedQuote?.quoteNumber}`}
        size="lg"
      >
        {selectedQuote && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-400">Événement</p>
                <p className="font-medium">{selectedQuote.event?.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Statut</p>
                {getStatusBadge(selectedQuote.status)}
              </div>
              <div>
                <p className="text-sm text-gray-400">Type</p>
                <p className="font-medium">{selectedQuote.event?.eventType || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Convives</p>
                <p className="font-medium">{selectedQuote.event?.guestCount || '-'} personnes</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Date d'émission</p>
                <p className="font-medium">{formatDate(selectedQuote.createdAt)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Valide jusqu'au</p>
                <p className="font-medium">{formatDate(selectedQuote.validUntil)}</p>
              </div>
            </div>

            {(selectedQuote.items || []).length > 0 && (
              <div className="border-t border-gray-200 pt-4">
                <h3 className="font-semibold mb-3">Détail des prestations</h3>
                <div className="space-y-2">
                  {selectedQuote.items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span>{item.quantity}x {item.name}</span>
                      <span className="font-medium">{Number(item.totalPrice).toFixed(2)} DT</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t border-gray-200 pt-4">
              <div className="space-y-1 text-sm text-gray-500">
                <div className="flex justify-between"><span>Sous-total</span><span>{(selectedQuote.subtotal || 0).toFixed(2)} DT</span></div>
                {selectedQuote.serviceFee > 0 && <div className="flex justify-between"><span>Frais de service</span><span>{selectedQuote.serviceFee.toFixed(2)} DT</span></div>}
                {selectedQuote.deliveryFee > 0 && <div className="flex justify-between"><span>Livraison</span><span>{selectedQuote.deliveryFee.toFixed(2)} DT</span></div>}
                <div className="flex justify-between"><span>TVA (19%)</span><span>{(selectedQuote.tax || 0).toFixed(2)} DT</span></div>
                {selectedQuote.discount > 0 && <div className="flex justify-between text-green-600"><span>Remise</span><span>-{selectedQuote.discount.toFixed(2)} DT</span></div>}
              </div>
              <div className="flex justify-between text-lg font-bold mt-2 pt-2 border-t border-gray-200">
                <span>Total TTC</span>
                <span>{selectedQuote.totalAmount.toFixed(2)} DT</span>
              </div>
            </div>

            <button
              onClick={() => printQuote(selectedQuote)}
              className="mt-4 w-full flex items-center justify-center gap-2 rounded-lg bg-gray-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-900 transition-colors"
            >
              <PrinterIcon className="h-4 w-4" />
              Imprimer le devis
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
