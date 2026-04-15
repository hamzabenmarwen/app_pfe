import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { eventService } from '@/services/event.service';
import { LoadingSpinner, Badge, Button } from '@/components/ui';
import toast from 'react-hot-toast';

interface QuoteItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface QuoteData {
  id: string;
  quoteNumber: string;
  status: string;
  subtotal: number;
  serviceFee: number;
  deliveryFee: number;
  tax: number;
  discount: number;
  totalAmount: number;
  validUntil: string;
  notes?: string;
  event?: {
    id: string;
    name: string;
    eventType: string;
    guestCount: number;
    eventDate: string;
  };
  items: QuoteItem[];
}

export default function QuoteViewPage() {
  const { quoteNumber } = useParams();
  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadQuote = async () => {
      if (!quoteNumber) return;

      try {
        const response = await eventService.getQuoteByNumber(quoteNumber);
        setQuote(response?.data || null);
      } catch {
        toast.error('Impossible de charger le devis. Vérifiez votre connexion ou reconnectez-vous.');
      } finally {
        setIsLoading(false);
      }
    };

    loadQuote();
  }, [quoteNumber]);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'info' | 'success' | 'warning' | 'error'> = {
      DRAFT: 'default',
      SENT: 'info',
      VIEWED: 'info',
      ACCEPTED: 'success',
      REJECTED: 'error',
      EXPIRED: 'warning',
    };

    const labels: Record<string, string> = {
      DRAFT: 'Brouillon',
      SENT: 'Envoyé',
      VIEWED: 'Consulté',
      ACCEPTED: 'Accepté',
      REJECTED: 'Refusé',
      EXPIRED: 'Expiré',
    };

    return <Badge variant={variants[status] || 'default'}>{labels[status] || status}</Badge>;
  };

  const formatPrice = (value: number) => {
    return (value || 0).toFixed(2) + ' DT';
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto py-20 flex justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="max-w-3xl mx-auto py-16 text-center">
        <h1 className="text-2xl font-medium text-gray-900/90">Devis introuvable</h1>
        <p className="text-gray-400 mt-2">Le devis demandé n'existe pas ou vous n'avez pas les droits pour le consulter.</p>
        <Link to="/dashboard/events" className="inline-block mt-6 text-primary-400/70 hover:text-primary-600">
          Retour à mes événements
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-medium text-gray-900/90">Devis #{quote.quoteNumber}</h1>
          <p className="text-gray-400 mt-1">
            {quote.event?.name ? `Événement: ${quote.event.name}` : 'Détail du devis'}
          </p>
        </div>
        {getStatusBadge(quote.status)}
      </div>

      <div className="glass-card p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-gray-400">Valide jusqu'au</p>
            <p className="font-medium text-gray-900">{new Date(quote.validUntil).toLocaleDateString('fr-FR')}</p>
          </div>
          <div>
            <p className="text-gray-400">Nombre d'invités</p>
            <p className="font-medium text-gray-900">{quote.event?.guestCount ?? '-'} personnes</p>
          </div>
          <div>
            <p className="text-gray-400">Date événement</p>
            <p className="font-medium text-gray-900">
              {quote.event?.eventDate ? new Date(quote.event.eventDate).toLocaleDateString('fr-FR') : '-'}
            </p>
          </div>
        </div>

        <div className="border-t pt-4">
          <h2 className="text-lg font-medium text-gray-900 mb-3">Lignes du devis</h2>
          <div className="space-y-2">
            {quote.items?.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-gray-700">{item.quantity} × {item.name}</span>
                <span className="font-medium text-gray-900">{formatPrice(item.totalPrice)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t pt-4 space-y-1 text-sm">
          <div className="flex justify-between"><span className="text-gray-500">Sous-total</span><span>{formatPrice(quote.subtotal)}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Frais de service</span><span>{formatPrice(quote.serviceFee)}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Livraison</span><span>{formatPrice(quote.deliveryFee)}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Taxe</span><span>{formatPrice(quote.tax)}</span></div>
          {quote.discount > 0 && (
            <div className="flex justify-between text-green-700"><span>Remise</span><span>-{formatPrice(quote.discount)}</span></div>
          )}
          <div className="flex justify-between text-base font-bold border-t pt-2 mt-2">
            <span>Total</span>
            <span>{formatPrice(quote.totalAmount)}</span>
          </div>
        </div>

        {quote.notes && (
          <div className="border-t pt-4">
            <p className="text-sm text-gray-400">Notes</p>
            <p className="text-gray-800 mt-1">{quote.notes}</p>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <Link to="/dashboard/events">
          <Button variant="outline">Retour à mes événements</Button>
        </Link>
      </div>
    </div>
  );
}
