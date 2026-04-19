import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { DocumentTextIcon, ArrowDownTrayIcon, EyeIcon, PrinterIcon, CreditCardIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { orderService, type Invoice } from '@/services/order.service';
import { eventService, type EventInvoice } from '@/services/event.service';
import { openPrintPreviewWindow, printInvoice } from '@/services/print.service';
import { LoadingSpinner, Badge, Button } from '@/components/ui';
import toast from 'react-hot-toast';
import { useSiteStore } from '@/stores/site.store';

interface DashboardInvoice {
  id: string;
  invoiceNumber: string;
  status: string;
  subtotal: number;
  tax: number;
  totalAmount: number;
  issuedAt: string;
  dueDate?: string;
  paidAt?: string;
  source: 'ORDER' | 'EVENT';
  orderId?: string;
  eventId?: string;
  eventName?: string;
  quoteNumber?: string;
  eventPayment?: EventInvoice['payment'] | null;
}

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function normalizeOrderInvoice(invoice: any): DashboardInvoice {
  const totalAmount = toNumber(invoice.totalAmount ?? invoice.amount ?? invoice.order?.totalAmount);
  const tax = toNumber(invoice.tax ?? invoice.taxAmount ?? invoice.order?.tax);
  const subtotal = toNumber(invoice.subtotal ?? invoice.order?.subtotal, Math.max(totalAmount - tax, 0));

  return {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber || `INV-${String(invoice.id || '').slice(-6).toUpperCase()}`,
    status: invoice.status || invoice.payment?.status || 'SENT',
    subtotal,
    tax,
    totalAmount,
    issuedAt: invoice.issuedAt || invoice.createdAt || new Date().toISOString(),
    dueDate: invoice.dueDate,
    paidAt: invoice.paidAt || invoice.payment?.paidAt,
    source: 'ORDER',
    orderId: invoice.orderId || invoice.order?.id,
  };
}

function normalizeEventInvoice(invoice: EventInvoice): DashboardInvoice {
  return {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    status: invoice.status,
    subtotal: invoice.subtotal,
    tax: invoice.tax,
    totalAmount: invoice.totalAmount,
    issuedAt: invoice.issuedAt,
    dueDate: invoice.dueDate,
    paidAt: invoice.paidAt,
    source: 'EVENT',
    eventId: invoice.eventId,
    eventName: invoice.event?.name,
    quoteNumber: invoice.quote?.quoteNumber,
    eventPayment: invoice.payment || null,
  };
}

export default function InvoicesPage() {
  const { config } = useSiteStore();
  const [invoices, setInvoices] = useState<DashboardInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    loadInvoices();
  }, []);

  useEffect(() => {
    const eventInvoiceId = searchParams.get('eventInvoiceId');
    const eventPayment = searchParams.get('eventPayment');

    if (!eventInvoiceId || !eventPayment) {
      return;
    }

    const processFlouciCallback = async () => {
      try {
        const refresh = await eventService.refreshEventInvoiceFlouciPayment(eventInvoiceId);
        const verified = Boolean(refresh?.data?.verified);

        if (verified) {
          toast.success('Paiement événement confirmé avec succès');
        } else if (eventPayment === 'failed') {
          toast.error('Le paiement a été annulé ou a échoué');
        } else {
          toast('Paiement en cours de vérification. Réessayez dans quelques secondes.');
        }

        await loadInvoices();
      } catch {
        toast.error('Impossible de vérifier le paiement événement');
      } finally {
        const next = new URLSearchParams(searchParams);
        next.delete('eventInvoiceId');
        next.delete('eventPayment');
        setSearchParams(next);
      }
    };

    void processFlouciCallback();
  }, [searchParams, setSearchParams]);

  const fetchAllOrderInvoices = async (): Promise<Invoice[]> => {
    const pageSize = 50;
    let page = 1;
    let totalPages = 1;
    const all: Invoice[] = [];

    do {
      const response = await orderService.getMyInvoices(page, pageSize);
      const pageData = (response.data || []) as Invoice[];
      const pagination = response.pagination as { totalPages?: number } | undefined;

      all.push(...pageData);
      totalPages = Math.max(pagination?.totalPages || 1, 1);
      page += 1;
    } while (page <= totalPages);

    return all;
  };

  const fetchAllEventInvoices = async (): Promise<EventInvoice[]> => {
    const pageSize = 50;
    let page = 1;
    let totalPages = 1;
    const all: EventInvoice[] = [];

    do {
      const response = await eventService.getMyEventInvoices(page, pageSize);
      const pageData = (response.data || []) as EventInvoice[];
      const pagination = response.pagination as { totalPages?: number } | undefined;

      all.push(...pageData);
      totalPages = Math.max(pagination?.totalPages || 1, 1);
      page += 1;
    } while (page <= totalPages);

    return all;
  };

  const loadInvoices = async () => {
    try {
      const [orderInvoicesResult, eventInvoicesResult] = await Promise.allSettled([
        fetchAllOrderInvoices(),
        fetchAllEventInvoices(),
      ]);

      const orderInvoicesRaw = orderInvoicesResult.status === 'fulfilled' ? orderInvoicesResult.value : [];
      const eventInvoicesRaw = eventInvoicesResult.status === 'fulfilled' ? eventInvoicesResult.value : [];

      if (orderInvoicesResult.status === 'rejected') {
        console.warn('Failed to load order invoices', orderInvoicesResult.reason);
      }

      if (eventInvoicesResult.status === 'rejected') {
        console.warn('Failed to load event invoices', eventInvoicesResult.reason);
      }

      const orderInvoices = orderInvoicesRaw.map(normalizeOrderInvoice);
      const eventInvoices = eventInvoicesRaw.map(normalizeEventInvoice);

      const merged = [...orderInvoices, ...eventInvoices].sort(
        (a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime()
      );

      setInvoices(merged);
    } catch (error) {
      toast.error('Erreur lors du chargement des factures');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'info' | 'success' | 'warning' | 'error'> = {
      DRAFT: 'default',
      SENT: 'info',
      COMPLETED: 'success',
      PAID: 'success',
      OVERDUE: 'error',
      FAILED: 'error',
      CANCELLED: 'error',
    };
    const labels: Record<string, string> = {
      DRAFT: 'Brouillon',
      SENT: 'Envoyée',
      COMPLETED: 'Payée',
      PAID: 'Payée',
      OVERDUE: 'En retard',
      FAILED: 'Échouée',
      CANCELLED: 'Annulée',
    };
    return <Badge variant={variants[status] || 'default'}>{labels[status] || status}</Badge>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatPrice = (price: number) => {
    return price.toFixed(2) + ' DT';
  };

  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      DRAFT: 'Brouillon',
      SENT: 'Envoyée',
      COMPLETED: 'Payée',
      PAID: 'Payée',
      OVERDUE: 'En retard',
      FAILED: 'Échouée',
      CANCELLED: 'Annulée',
    };
    return labels[status] || status;
  };

  const handlePrintInvoice = async (invoice: DashboardInvoice) => {
    const previewWindow = openPrintPreviewWindow('Préparation de la facture...');
    if (!previewWindow) {
      toast.error('Veuillez autoriser les popups pour imprimer');
      return;
    }

    try {
      if (invoice.source === 'ORDER') {
        if (!invoice.orderId) {
          previewWindow.close();
          toast.error('Commande introuvable pour impression');
          return;
        }

        const orderResponse = await orderService.getOrderById(invoice.orderId);
        const order = orderResponse?.data;

        printInvoice({
          invoiceNumber: invoice.invoiceNumber,
          sourceLabel: 'Commande',
          statusLabel: getStatusLabel(invoice.status),
          issuedAt: invoice.issuedAt,
          dueDate: invoice.dueDate,
          subtotal: invoice.subtotal,
          tax: invoice.tax,
          totalAmount: invoice.totalAmount,
          reference: order?.orderNumber || invoice.orderId,
          notes: order?.notes,
          items: (order?.items || []).map((item: any) => ({
            name: item.platName,
            quantity: item.quantity,
            unitPrice: Number(item.unitPrice),
            totalPrice: Number(item.unitPrice) * item.quantity,
          })),
        }, previewWindow, config);
        return;
      }

      let eventLabel = invoice.eventName;
      if (!eventLabel && invoice.eventId) {
        try {
          const eventResponse = await eventService.getEventById(invoice.eventId);
          eventLabel = eventResponse?.data?.name;
        } catch {
          // Ignore optional enrichment failure.
        }
      }

      printInvoice({
        invoiceNumber: invoice.invoiceNumber,
        sourceLabel: 'Événement',
        statusLabel: getStatusLabel(invoice.status),
        issuedAt: invoice.issuedAt,
        dueDate: invoice.dueDate,
        subtotal: invoice.subtotal,
        tax: invoice.tax,
        totalAmount: invoice.totalAmount,
        reference: eventLabel || invoice.quoteNumber || invoice.eventId || '-',
      }, previewWindow, config);
    } catch {
      previewWindow.close();
      toast.error('Erreur lors de l\'impression de la facture');
    }
  };

  const canPayEventInvoice = (invoice: DashboardInvoice) => {
    if (invoice.source !== 'EVENT') return false;
    if (invoice.status === 'PAID' || invoice.status === 'COMPLETED' || invoice.status === 'CANCELLED') return false;
    return true;
  };

  const handleInitiateEventPayment = async (invoice: DashboardInvoice) => {
    if (invoice.source !== 'EVENT') return;

    try {
      const result = await eventService.initiateEventInvoiceFlouciPayment(invoice.id);
      const paymentUrl = result?.data?.paymentUrl;

      if (!paymentUrl) {
        throw new Error('Payment URL missing');
      }

      window.location.href = paymentUrl;
    } catch {
      toast.error('Impossible d\'initialiser le paiement pour cette facture');
    }
  };

  const handleRefreshEventPayment = async (invoice: DashboardInvoice) => {
    if (invoice.source !== 'EVENT') return;

    try {
      const result = await eventService.refreshEventInvoiceFlouciPayment(invoice.id);
      const verified = Boolean(result?.data?.verified);

      if (verified) {
        toast.success('Paiement confirmé');
      } else {
        toast('Paiement toujours en attente de confirmation');
      }

      await loadInvoices();
    } catch {
      toast.error('Impossible de rafraîchir le statut de paiement');
    }
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
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <h1 className="text-2xl font-medium text-gray-900/90">Mes Factures</h1>
      </motion.div>

      {invoices.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card text-center py-16"
        >
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <DocumentTextIcon className="h-14 w-14 mx-auto text-gray-400" />
          </motion.div>
          <p className="text-gray-400 mt-4">Vous n'avez pas encore de factures</p>
          <p className="text-sm text-gray-400 mt-2">
            Les factures apparaîtront ici après vos commandes ou l'acceptation d'un devis
          </p>
        </motion.div>
      ) : (
        <>
          {/* Mobile: Card layout */}
          <div className="space-y-4 lg:hidden">
            {invoices.map((invoice, i) => (
              <motion.div
                key={invoice.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass-card p-5"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium text-gray-900">{invoice.invoiceNumber}</span>
                  {getStatusBadge(invoice.status)}
                </div>
                <div className="flex items-center justify-between text-sm text-gray-400 mb-3">
                  <span>{formatDate(invoice.issuedAt)}</span>
                  <span className="font-medium text-gray-900">{formatPrice(invoice.totalAmount)}</span>
                </div>
                {invoice.source === 'ORDER' && (
                  <div className="text-xs text-gray-400 mb-3">
                    Source: Commande
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 !rounded-xl"
                    onClick={() => {
                      if (invoice.source === 'ORDER' && invoice.orderId) {
                        navigate(`/dashboard/orders/${invoice.orderId}`);
                        return;
                      }

                      if (invoice.source === 'EVENT' && invoice.eventId) {
                        navigate(`/dashboard/events/${invoice.eventId}`);
                      }
                    }}
                  >
                    <EyeIcon className="h-4 w-4 mr-1" />
                    Voir
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 !rounded-xl" onClick={() => handlePrintInvoice(invoice)}>
                    <PrinterIcon className="h-4 w-4 mr-1" />
                    Imprimer
                  </Button>
                  {invoice.source === 'ORDER' && invoice.orderId && (
                    <Button variant="outline" size="sm" className="flex-1 !rounded-xl" onClick={async () => {
                      try {
                        const blob = await orderService.downloadInvoice(invoice.orderId as string);
                        const url = window.URL.createObjectURL(new Blob([blob]));
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `${invoice.invoiceNumber}.pdf`;
                        link.click();
                        window.URL.revokeObjectURL(url);
                      } catch {
                        toast.error('Erreur lors du téléchargement');
                      }
                    }}>
                      <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
                      PDF
                    </Button>
                  )}
                  {invoice.source === 'EVENT' && canPayEventInvoice(invoice) && (
                    <Button variant="outline" size="sm" className="flex-1 !rounded-xl" onClick={() => handleInitiateEventPayment(invoice)}>
                      <CreditCardIcon className="h-4 w-4 mr-1" />
                      Payer
                    </Button>
                  )}
                  {invoice.source === 'EVENT' && (
                    <Button variant="outline" size="sm" className="flex-1 !rounded-xl" onClick={() => handleRefreshEventPayment(invoice)}>
                      <ArrowPathIcon className="h-4 w-4 mr-1" />
                      Vérifier
                    </Button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Desktop: Table layout */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="hidden lg:block glass-card overflow-hidden"
          >
            <table className="min-w-full divide-y divide-gray-100/60">
              <thead className="bg-transparent/60">
                <tr>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Numéro</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Montant</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Statut</th>
                  <th className="px-6 py-3.5 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100/60">
                {invoices.map((invoice, i) => (
                  <motion.tr
                    key={invoice.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.15 + i * 0.04 }}
                    className="hover:bg-primary-500/10 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{invoice.invoiceNumber}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{formatDate(invoice.issuedAt)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{formatPrice(invoice.totalAmount)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(invoice.status)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="!rounded-xl"
                          onClick={() => {
                            if (invoice.source === 'ORDER' && invoice.orderId) {
                              navigate(`/dashboard/orders/${invoice.orderId}`);
                              return;
                            }

                            if (invoice.source === 'EVENT' && invoice.eventId) {
                              navigate(`/dashboard/events/${invoice.eventId}`);
                            }
                          }}
                        >
                          <EyeIcon className="h-4 w-4 mr-1" />
                          Voir
                        </Button>
                        <Button variant="outline" size="sm" className="!rounded-xl" onClick={() => handlePrintInvoice(invoice)}>
                          <PrinterIcon className="h-4 w-4 mr-1" />
                          Imprimer
                        </Button>
                        {invoice.source === 'ORDER' && invoice.orderId && (
                          <Button variant="outline" size="sm" className="!rounded-xl" onClick={async () => {
                            try {
                              const blob = await orderService.downloadInvoice(invoice.orderId as string);
                              const url = window.URL.createObjectURL(new Blob([blob]));
                              const link = document.createElement('a');
                              link.href = url;
                              link.download = `${invoice.invoiceNumber}.pdf`;
                              link.click();
                              window.URL.revokeObjectURL(url);
                            } catch {
                              toast.error('Erreur lors du téléchargement');
                            }
                          }}>
                            <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
                            PDF
                          </Button>
                        )}
                        {invoice.source === 'EVENT' && canPayEventInvoice(invoice) && (
                          <Button variant="outline" size="sm" className="!rounded-xl" onClick={() => handleInitiateEventPayment(invoice)}>
                            <CreditCardIcon className="h-4 w-4 mr-1" />
                            Payer
                          </Button>
                        )}
                        {invoice.source === 'EVENT' && (
                          <Button variant="outline" size="sm" className="!rounded-xl" onClick={() => handleRefreshEventPayment(invoice)}>
                            <ArrowPathIcon className="h-4 w-4 mr-1" />
                            Vérifier
                          </Button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        </>
      )}
    </div>
  );
}
