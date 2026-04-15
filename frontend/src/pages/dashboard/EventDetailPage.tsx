import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeftIcon, CheckIcon, XMarkIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { eventService, type Event, type Quote } from '@/services/event.service';
import { LoadingSpinner, Badge, Button } from '@/components/ui';
import toast from 'react-hot-toast';

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [processingQuote, setProcessingQuote] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadEvent();
    }
  }, [id]);

  const loadEvent = async () => {
    try {
      const response = await eventService.getEventById(id!);
      setEvent(response.data);
    } catch (error) {
      toast.error('Événement introuvable');
      navigate('/dashboard/events');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptQuote = async (quoteId: string) => {
    setProcessingQuote(quoteId);
    try {
      await eventService.acceptQuote(quoteId);
      toast.success('Devis accepté ! Vous serez contacté pour le paiement.');
      loadEvent();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erreur lors de l\'acceptation');
    } finally {
      setProcessingQuote(null);
    }
  };

  const handleRejectQuote = async (quoteId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir refuser ce devis ?')) return;

    setProcessingQuote(quoteId);
    try {
      await eventService.rejectQuote(quoteId);
      toast.success('Devis refusé');
      loadEvent();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erreur lors du refus');
    } finally {
      setProcessingQuote(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'info' | 'success' | 'warning' | 'error'> = {
      DRAFT: 'default',
      PENDING: 'warning',
      PENDING_QUOTE: 'warning',
      QUOTE_SENT: 'info',
      QUOTE_ACCEPTED: 'success',
      CONFIRMED: 'success',
      IN_PROGRESS: 'info',
      COMPLETED: 'info',
      CANCELLED: 'error',
    };
    const labels: Record<string, string> = {
      DRAFT: 'Brouillon',
      PENDING: 'En attente de devis',
      PENDING_QUOTE: 'En attente de devis',
      QUOTE_SENT: 'Devis envoyé',
      QUOTE_ACCEPTED: 'Devis accepté',
      CONFIRMED: 'Confirmé',
      IN_PROGRESS: 'En cours',
      COMPLETED: 'Terminé',
      CANCELLED: 'Annulé',
    };
    return <Badge variant={variants[status] || 'default'}>{labels[status] || status}</Badge>;
  };

  const getQuoteStatusBadge = (status: string) => {
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

  const detailedQuote = event?.quotes?.length
    ? [...event.quotes]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .find((q) => q.status === 'SENT' || q.status === 'ACCEPTED') ||
    [...event.quotes].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
    : null;

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400">Événement introuvable</p>
        <Link to="/dashboard/events" className="text-primary-400/70 hover:text-primary-600 mt-2 inline-block">
          Retour aux événements
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div className="flex items-center gap-4">
          <Link to="/dashboard/events" className="text-gray-400 hover:text-gray-600 transition-colors p-1.5 rounded-xl hover:bg-gray-50/80">
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-medium text-gray-900/90">{event.name}</h1>
            <p className="text-gray-400 text-sm">{event.eventType || event.type}</p>
          </div>
        </div>
        {getStatusBadge(event.status)}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Event Details */}
        <div className="lg:col-span-2 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card"
          >
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="font-medium text-gray-900">Détails de l'événement</h2>
            </div>
            <div className="px-6 py-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-400">Date</p>
                  <p className="font-medium text-gray-900">
                    {new Date(event.eventDate || event.date).toLocaleDateString('fr-FR', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Horaires</p>
                  <p className="font-medium text-gray-900">
                    {event.startTime || '--:--'} - {event.endTime || '--:--'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Nombre d'invités</p>
                  <p className="font-medium text-gray-900">{event.guestCount} personnes</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Budget estimé</p>
                  <p className="font-medium text-gray-900">
                    {event.budget ? `${event.budget.toFixed(2)} DT` : 'Non défini'}
                  </p>
                </div>
              </div>

              {event.venue && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-400 mb-2">Lieu</p>
                  <p className="font-medium text-gray-900">{event.venue.name}</p>
                  <p className="text-gray-500 text-sm">{event.venue.address}</p>
                  <p className="text-gray-500 text-sm">{event.venue.zipCode} {event.venue.city}</p>
                </div>
              )}

              {event.description && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-400 mb-2">Description</p>
                  <p className="text-gray-500 text-sm">{event.description}</p>
                </div>
              )}

              {detailedQuote && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <p className="text-sm text-gray-400">Détails du devis</p>
                    <div className="flex items-center gap-2">
                      {getQuoteStatusBadge(detailedQuote.status)}
                      <Link
                        to={`/quotes/${detailedQuote.quoteNumber}`}
                        className="inline-flex items-center gap-1.5 text-xs text-primary-500 hover:text-primary-600 transition-colors"
                      >
                        <DocumentTextIcon className="h-4 w-4" />
                        Voir le devis complet
                      </Link>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-gray-500">
                      <span>Sous-total</span>
                      <span>{detailedQuote.subtotal.toFixed(2)} DT</span>
                    </div>
                    <div className="flex justify-between text-gray-500">
                      <span>Frais de service</span>
                      <span>{detailedQuote.serviceFee.toFixed(2)} DT</span>
                    </div>
                    {detailedQuote.discount > 0 && (
                      <div className="flex justify-between text-emerald-600">
                        <span>Remise</span>
                        <span>-{detailedQuote.discount.toFixed(2)} DT</span>
                      </div>
                    )}
                    <div className="flex justify-between font-medium text-gray-900 border-t border-gray-200 pt-2">
                      <span>Total</span>
                      <span>{detailedQuote.totalAmount.toFixed(2)} DT</span>
                    </div>
                  </div>

                  {detailedQuote.items?.length > 0 && (
                    <div className="mt-4 border-t border-gray-200 pt-3">
                      <p className="text-xs uppercase tracking-wide text-gray-400 mb-2">Détail des lignes</p>
                      <div className="space-y-2">
                        {detailedQuote.items.map((item) => (
                          <div key={item.id} className="rounded-lg border border-gray-100 bg-gray-50/40 p-2.5">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="text-sm font-medium text-gray-900">{item.name}</p>
                                {item.category && (
                                  <p className="text-xs text-gray-500">Catégorie: {item.category}</p>
                                )}
                                {item.description && (
                                  <p className="text-xs text-gray-500 mt-1">{item.description}</p>
                                )}
                                {item.notes && (
                                  <p className="text-xs text-gray-500 mt-1">Note admin: {item.notes}</p>
                                )}
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-gray-500">{item.quantity} × {item.unitPrice.toFixed(2)} DT</p>
                                <p className="text-sm font-medium text-gray-900">{item.totalPrice.toFixed(2)} DT</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {(detailedQuote.notes || detailedQuote.termsConditions) && (
                    <div className="mt-4 border-t border-gray-200 pt-3 space-y-2">
                      {detailedQuote.notes && (
                        <div>
                          <p className="text-xs uppercase tracking-wide text-gray-400">Notes du devis</p>
                          <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{detailedQuote.notes}</p>
                        </div>
                      )}
                      {detailedQuote.termsConditions && (
                        <div>
                          <p className="text-xs uppercase tracking-wide text-gray-400">Conditions</p>
                          <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{detailedQuote.termsConditions}</p>
                        </div>
                      )}
                    </div>
                  )}

                  <p className="text-xs text-gray-400 mt-3">
                    Valide jusqu'au {new Date(detailedQuote.validUntil).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Menu Items */}
          {event.menuItems && event.menuItems.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-card overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="font-medium text-gray-900">Menu sélectionné</h2>
              </div>
              <div className="divide-y divide-gray-100/60">
                {event.menuItems.map((item, index) => (
                  <div key={index} className="px-6 py-3 flex items-center justify-between hover:bg-primary-500/10 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">???</span>
                      <span className="text-gray-900 text-sm">{item.platName}</span>
                    </div>
                    {item.quantity && (
                      <span className="text-gray-400 text-sm">× {item.quantity}</span>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        {/* Quotes */}
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="glass-card"
          >
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="font-medium text-gray-900">Devis</h2>
            </div>
            <div className="px-6 py-5">
              {event.quotes && event.quotes.length > 0 ? (
                <div className="space-y-4">
                  {event.quotes.map((quote: Quote) => (
                    <div key={quote.id} className="border border-gray-200 rounded-xl p-4 bg-transparent/30">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-medium text-gray-900 text-sm">
                          #{quote.quoteNumber}
                        </span>
                        {getQuoteStatusBadge(quote.status)}
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between text-gray-500">
                          <span>Sous-total</span>
                          <span>{quote.subtotal.toFixed(2)} DT</span>
                        </div>
                        <div className="flex justify-between text-gray-500">
                          <span>Frais de service</span>
                          <span>{quote.serviceFee.toFixed(2)} DT</span>
                        </div>
                        {quote.discount > 0 && (
                          <div className="flex justify-between text-emerald-600">
                            <span>Remise</span>
                            <span>-{quote.discount.toFixed(2)} DT</span>
                          </div>
                        )}
                        <div className="flex justify-between font-medium text-gray-900 border-t border-gray-200 pt-2">
                          <span>Total</span>
                          <span>{quote.totalAmount.toFixed(2)} DT</span>
                        </div>
                      </div>

                      <p className="text-xs text-gray-400 mt-2">
                        Valide jusqu'au {new Date(quote.validUntil).toLocaleDateString('fr-FR')}
                      </p>

                      <div className="mt-3">
                        <Link
                          to={`/quotes/${quote.quoteNumber}`}
                          className="inline-flex items-center gap-1.5 text-xs text-primary-500 hover:text-primary-600 transition-colors"
                        >
                          <DocumentTextIcon className="h-4 w-4" />
                          Voir le devis complet
                        </Link>
                      </div>

                      {quote.status === 'SENT' && (
                        <div className="flex gap-2 mt-4">
                          <Button
                            size="sm"
                            className="flex-1 !rounded-xl"
                            onClick={() => handleAcceptQuote(quote.id)}
                            isLoading={processingQuote === quote.id}
                          >
                            <CheckIcon className="h-4 w-4 mr-1" />
                            Accepter
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 !rounded-xl"
                            onClick={() => handleRejectQuote(quote.id)}
                            isLoading={processingQuote === quote.id}
                          >
                            <XMarkIcon className="h-4 w-4 mr-1" />
                            Refuser
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-400 text-sm">
                    Aucun devis pour le moment
                  </p>
                  <p className="text-gray-400 text-xs mt-1">
                    Vous recevrez un devis après validation de votre demande
                  </p>
                </div>
              )}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="glass-card"
          >
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="font-medium text-gray-900">Statut</h2>
            </div>
            <div className="px-6 py-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center">
                  <CheckIcon className="h-4 w-4 text-emerald-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 text-sm">Demande créée</p>
                  <p className="text-xs text-gray-400">
                    {new Date(event.createdAt).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </div>

              {['QUOTE_SENT', 'QUOTE_ACCEPTED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED'].includes(event.status) && (
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center">
                    <CheckIcon className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">Devis envoyé</p>
                  </div>
                </div>
              )}

              {['QUOTE_ACCEPTED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED'].includes(event.status) && (
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center">
                    <CheckIcon className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">Devis accepté</p>
                  </div>
                </div>
              )}

              {['CONFIRMED', 'IN_PROGRESS', 'COMPLETED'].includes(event.status) && (
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center">
                    <CheckIcon className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">Confirmé</p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
