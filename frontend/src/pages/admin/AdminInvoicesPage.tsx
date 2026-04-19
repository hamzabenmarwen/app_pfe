import { useEffect, useMemo, useState } from 'react';
import {
  BanknotesIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
  ArrowUturnLeftIcon,
  MagnifyingGlassIcon,
  DocumentTextIcon,
  PlusCircleIcon,
} from '@heroicons/react/24/outline';
import { orderService } from '@/services/order.service';
import { eventService, type EventInvoice } from '@/services/event.service';
import { paymentService, getPaymentMethodLabel } from '@/services/payment.service';
import { Badge, Button, LoadingSpinner } from '@/components/ui';
import toast from 'react-hot-toast';

type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED' | 'UNPAID' | 'ALL';

type AdminInvoice = {
  id: string;
  source: 'ORDER' | 'EVENT';
  orderId?: string;
  eventId?: string;
  paidAt?: string;
  status?: string;
  invoiceNumber: string;
  amount: number;
  taxAmount: number;
  createdAt: string;
  order?: {
    id: string;
    orderNumber?: string;
    totalAmount?: number;
    userId?: string;
  } | null;
  payment?: {
    id: string;
    amount: number;
    method?: string;
    status: Exclude<PaymentStatus, 'UNPAID' | 'ALL'>;
    paidAt?: string;
  } | null;
  event?: {
    id: string;
    name?: string;
  } | null;
  quote?: {
    id: string;
    quoteNumber?: string;
  } | null;
};

type AdminInvoicesPageProps = {
  mode?: 'documents' | 'finance';
};

const PAYMENT_FILTERS: Array<{ value: PaymentStatus; label: string }> = [
  { value: 'ALL', label: 'Tous' },
  { value: 'UNPAID', label: 'Sans paiement' },
  { value: 'PENDING', label: 'En attente' },
  { value: 'COMPLETED', label: 'Paye' },
  { value: 'REFUNDED', label: 'Rembourse' },
  { value: 'FAILED', label: 'Echoue' },
];

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatAmount(value: number) {
  return `${value.toFixed(2)} DT`;
}

function normalizeOrderInvoice(invoice: any): AdminInvoice {
  return {
    id: invoice.id,
    source: 'ORDER',
    orderId: invoice.orderId,
    invoiceNumber: invoice.invoiceNumber,
    amount: Number(invoice.amount || 0),
    taxAmount: Number(invoice.taxAmount || 0),
    createdAt: invoice.createdAt,
    paidAt: invoice.paidAt,
    order: invoice.order || null,
    payment: invoice.payment || null,
  };
}

function normalizeEventInvoice(invoice: EventInvoice): AdminInvoice {
  return {
    id: invoice.id,
    source: 'EVENT',
    eventId: invoice.eventId,
    invoiceNumber: invoice.invoiceNumber,
    amount: Number(invoice.totalAmount || 0),
    taxAmount: Number(invoice.tax || 0),
    createdAt: invoice.issuedAt,
    paidAt: invoice.paidAt,
    status: invoice.status,
    payment: invoice.paidAt
      ? {
          id: `event-payment-${invoice.id}`,
          amount: Number(invoice.totalAmount || 0),
          method: 'CASH',
          status: 'COMPLETED',
          paidAt: invoice.paidAt,
        }
      : null,
    event: invoice.event
      ? {
          id: invoice.event.id,
          name: invoice.event.name,
        }
      : null,
    quote: invoice.quote
      ? {
          id: invoice.quote.id,
          quoteNumber: invoice.quote.quoteNumber,
        }
      : null,
  };
}

function getEffectivePaymentStatus(invoice: AdminInvoice): PaymentStatus {
  if (invoice.source === 'EVENT') {
    if (invoice.status === 'PAID' || invoice.paidAt) return 'COMPLETED';
    if (invoice.status === 'CANCELLED') return 'FAILED';
    return 'PENDING';
  }

  return invoice.payment?.status ?? 'UNPAID';
}

function getPaymentBadge(status: PaymentStatus) {
  const map: Record<PaymentStatus, { label: string; variant: 'default' | 'info' | 'success' | 'warning' | 'error' }> = {
    ALL: { label: 'Tous', variant: 'default' },
    UNPAID: { label: 'Sans paiement', variant: 'default' },
    PENDING: { label: 'En attente', variant: 'warning' },
    COMPLETED: { label: 'Paye', variant: 'success' },
    REFUNDED: { label: 'Rembourse', variant: 'default' },
    FAILED: { label: 'Echoue', variant: 'error' },
  };
  const cfg = map[status] ?? map.ALL;
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

export default function AdminInvoicesPage({ mode = 'documents' }: AdminInvoicesPageProps) {
  const [invoices, setInvoices] = useState<AdminInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [eventInvoiceWarning, setEventInvoiceWarning] = useState<string | null>(null);
  const [paymentFilter, setPaymentFilter] = useState<PaymentStatus>(
    mode === 'finance' ? 'PENDING' : 'ALL',
  );

  const isFinanceMode = mode === 'finance';

  const title = isFinanceMode ? 'Paiements et caisse' : 'Factures';
  const subtitle = isFinanceMode
    ? 'Suivi des paiements clients et actions de caisse.'
    : 'Liste des factures clients avec statut de paiement.';

  const loadInvoices = async () => {
    try {
      setEventInvoiceWarning(null);

      const [orderInvoicesRes, eventInvoicesRes] = await Promise.allSettled([
        orderService.getAllInvoices(1, 100),
        eventService.getAllEventInvoices(1, 100),
      ]);

      const orderInvoices = orderInvoicesRes.status === 'fulfilled'
        ? ((orderInvoicesRes.value.data || []) as any[]).map(normalizeOrderInvoice)
        : [];

      const eventInvoices = eventInvoicesRes.status === 'fulfilled'
        ? ((eventInvoicesRes.value.data || []) as EventInvoice[]).map(normalizeEventInvoice)
        : [];

      if (orderInvoicesRes.status === 'rejected') {
        throw orderInvoicesRes.reason;
      }

      if (eventInvoicesRes.status === 'rejected') {
        console.warn('Event invoices endpoint unavailable in this environment', eventInvoicesRes.reason);
        setEventInvoiceWarning('Factures événements temporairement indisponibles. Les factures commandes restent affichées.');
      }

      const merged = [...orderInvoices, ...eventInvoices].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setInvoices(merged);
    } catch {
      toast.error('Erreur lors du chargement des factures');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, []);

  const filteredInvoices = useMemo(() => {
    return invoices.filter((invoice) => {
      const paymentStatus = getEffectivePaymentStatus(invoice);

      const matchesFilter =
        paymentFilter === 'ALL' ? true : paymentFilter === 'UNPAID' ? !invoice.payment : paymentStatus === paymentFilter;

      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        q.length === 0 ||
        invoice.invoiceNumber.toLowerCase().includes(q) ||
        (invoice.orderId || '').toLowerCase().includes(q) ||
        (invoice.eventId || '').toLowerCase().includes(q) ||
        (invoice.order?.orderNumber || '').toLowerCase().includes(q) ||
        (invoice.order?.userId || '').toLowerCase().includes(q) ||
        (invoice.event?.name || '').toLowerCase().includes(q) ||
        (invoice.quote?.quoteNumber || '').toLowerCase().includes(q);

      return matchesFilter && matchesSearch;
    });
  }, [invoices, paymentFilter, searchQuery]);

  const totals = useMemo(() => {
    const totalAmount = invoices.reduce((sum, invoice) => sum + invoice.amount, 0);
    const pendingAmount = invoices
      .filter((invoice) => !invoice.payment || invoice.payment.status === 'PENDING')
      .reduce((sum, invoice) => sum + invoice.amount, 0);
    const paidAmount = invoices
      .filter((invoice) => invoice.payment?.status === 'COMPLETED')
      .reduce((sum, invoice) => sum + invoice.amount, 0);
    const refundedAmount = invoices
      .filter((invoice) => invoice.payment?.status === 'REFUNDED')
      .reduce((sum, invoice) => sum + invoice.amount, 0);

    return { totalAmount, pendingAmount, paidAmount, refundedAmount };
  }, [invoices]);

  const handleDownloadInvoice = async (invoice: AdminInvoice) => {
    if (invoice.source !== 'ORDER' || !invoice.orderId) {
      toast.error('PDF indisponible pour cette facture evenement');
      return;
    }

    try {
      setIsSubmitting(invoice.id);
      const blob = await orderService.downloadInvoice(invoice.orderId);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `Facture-${invoice.invoiceNumber}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
      toast.success('Facture telechargee');
    } catch {
      toast.error('Impossible de telecharger la facture');
    } finally {
      setIsSubmitting(null);
    }
  };

  const handleCreateCashPayment = async (invoice: AdminInvoice) => {
    if (invoice.source !== 'ORDER' || !invoice.orderId) {
      toast.error('Paiement caisse uniquement pour les factures commandes');
      return;
    }

    try {
      setIsSubmitting(invoice.id);
      await paymentService.createCashPayment(invoice.orderId);
      toast.success('Paiement caisse cree');
      await loadInvoices();
    } catch {
      toast.error('Erreur lors de la creation du paiement');
    } finally {
      setIsSubmitting(null);
    }
  };

  const handleMarkAsPaid = async (invoice: AdminInvoice) => {
    try {
      setIsSubmitting(invoice.id);

      if (invoice.source === 'EVENT') {
        await eventService.markEventInvoicePaid(invoice.id);
      } else if (invoice.orderId) {
        await paymentService.markAsPaid(invoice.orderId);
      } else {
        throw new Error('Order invoice is missing order id');
      }

      toast.success('Paiement marque comme paye');
      await loadInvoices();
    } catch {
      toast.error('Erreur lors de la confirmation du paiement');
    } finally {
      setIsSubmitting(null);
    }
  };

  const handleRefund = async (invoice: AdminInvoice) => {
    if (invoice.source !== 'ORDER' || !invoice.orderId) {
      toast.error('Remboursement uniquement pour les factures commandes');
      return;
    }

    try {
      setIsSubmitting(invoice.id);
      await paymentService.refundPayment(invoice.orderId);
      toast.success('Paiement rembourse');
      await loadInvoices();
    } catch {
      toast.error('Erreur lors du remboursement');
    } finally {
      setIsSubmitting(null);
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium text-gray-900/90">{title}</h1>
          <p className="text-gray-400 mt-1">{subtitle}</p>
        </div>
      </div>

      {eventInvoiceWarning && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {eventInvoiceWarning}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-gray-400">Total facture</p>
          <p className="mt-2 text-xl font-semibold text-gray-900">{formatAmount(totals.totalAmount)}</p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs uppercase tracking-wide text-amber-700">A encaisser</p>
          <p className="mt-2 text-xl font-semibold text-amber-800">{formatAmount(totals.pendingAmount)}</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-xs uppercase tracking-wide text-emerald-700">Encaisse</p>
          <p className="mt-2 text-xl font-semibold text-emerald-800">{formatAmount(totals.paidAmount)}</p>
        </div>
        <div className="rounded-2xl border border-gray-300 bg-gray-50 p-4">
          <p className="text-xs uppercase tracking-wide text-gray-600">Rembourse</p>
          <p className="mt-2 text-xl font-semibold text-gray-800">{formatAmount(totals.refundedAmount)}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher par facture, commande ou client"
              className="w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-3 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
          </div>
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value as PaymentStatus)}
            className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
          >
            {PAYMENT_FILTERS.map((filter) => (
              <option key={filter.value} value={filter.value}>
                {filter.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        {filteredInvoices.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <DocumentTextIcon className="mx-auto h-10 w-10 mb-3" />
            Aucune facture trouvee.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Facture</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Commande</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Montant</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Paiement</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {filteredInvoices.map((invoice) => {
                  const paymentStatus = getEffectivePaymentStatus(invoice);
                  const rowBusy = isSubmitting === invoice.id;

                  return (
                    <tr key={invoice.id} className="hover:bg-gray-50/60">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{invoice.invoiceNumber}</p>
                        <p className="text-xs text-gray-500">
                          {invoice.source === 'ORDER' ? 'Source: Commande' : 'Source: Evenement'}
                        </p>
                        <p className="text-xs text-gray-400">ID: {invoice.id.slice(0, 8)}...</p>
                      </td>
                      <td className="px-4 py-3">
                        {invoice.source === 'ORDER' ? (
                          <>
                            <p className="text-sm text-gray-800">{invoice.order?.orderNumber || invoice.orderId?.slice(0, 8) || '-'}</p>
                            <p className="text-xs text-gray-400">Client: {invoice.order?.userId?.slice(0, 8) || '-'}</p>
                          </>
                        ) : (
                          <>
                            <p className="text-sm text-gray-800">{invoice.event?.name || invoice.eventId?.slice(0, 8) || '-'}</p>
                            <p className="text-xs text-gray-400">Devis: {invoice.quote?.quoteNumber || '-'}</p>
                          </>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{formatDate(invoice.createdAt)}</td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-900">{formatAmount(invoice.amount)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <div>{getPaymentBadge(paymentStatus)}</div>
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <BanknotesIcon className="h-3.5 w-3.5" />
                            {invoice.source === 'EVENT'
                              ? invoice.paidAt
                                ? 'Validation admin'
                                : 'En attente'
                              : invoice.payment
                                ? getPaymentMethodLabel(invoice.payment.method)
                                : 'Non cree'}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadInvoice(invoice)}
                            disabled={rowBusy}
                            title="Telecharger PDF"
                          >
                            <ArrowDownTrayIcon className="h-4 w-4" />
                          </Button>

                          {!invoice.payment && (
                            <Button
                              size="sm"
                              onClick={() => handleCreateCashPayment(invoice)}
                              disabled={rowBusy}
                              title="Creer paiement caisse"
                            >
                              <PlusCircleIcon className="h-4 w-4" />
                            </Button>
                          )}

                          {paymentStatus === 'PENDING' && (
                            <Button
                              size="sm"
                              onClick={() => handleMarkAsPaid(invoice)}
                              disabled={rowBusy}
                              title="Marquer paye"
                            >
                              <CheckCircleIcon className="h-4 w-4" />
                            </Button>
                          )}

                          {invoice.source === 'ORDER' && invoice.payment?.status === 'COMPLETED' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRefund(invoice)}
                              disabled={rowBusy}
                              title="Rembourser"
                            >
                              <ArrowUturnLeftIcon className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
