import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeftIcon, DocumentPlusIcon, CheckCircleIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';
import { eventService, type Event, type Quote } from '@/services/event.service';
import { Button, LoadingSpinner, Badge, Input } from '@/components/ui';
import toast from 'react-hot-toast';

export default function AdminEventDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Quote Creation State
  const [isCreatingQuote, setIsCreatingQuote] = useState(false);
  const [quoteItems, setQuoteItems] = useState<any[]>([]);
  const [serviceFee, setServiceFee] = useState<number | ''>('');
  const [deliveryFee, setDeliveryFee] = useState<number | ''>('');
  const [discount, setDiscount] = useState<number | ''>('');
  const [validDays, setValidDays] = useState<number | ''>(30);
  const [terms, setTerms] = useState("• Acompte de 30% requis à la confirmation.\n• Le solde est dû le jour de l'événement.\n• Toute modification du nombre de convives doit être signalée 48h à l'avance.");

  useEffect(() => {
    if (id) {
      loadEventDetails();
    }
  }, [id]);

  const loadEventDetails = async () => {
    try {
      const response = await eventService.getEventById(id!);
      const evt = response.data;
      setEvent(evt);
      
      // Initialize quote items with requested menu items
      if (evt.menuItems && evt.menuItems.length > 0) {
        setQuoteItems(evt.menuItems.map((item: any) => ({
          platId: item.platId,
          name: item.platName,
          quantity: item.quantity || evt.guestCount,
          unitPrice: ''
        })));
      }
    } catch (error) {
      toast.error('Erreur lors du chargement de l\'événement');
      navigate('/admin/events');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateSubtotal = () => {
    return quoteItems.reduce((acc, item) => acc + (item.unitPrice * item.quantity), 0);
  };

  const calculateTotal = () => {
    const sub = calculateSubtotal();
    const sFee = Number(serviceFee) || 0;
    const dFee = Number(deliveryFee) || 0;
    const disc = Number(discount) || 0;
    const taxable = sub + sFee + dFee - disc;
    const tax = taxable * 0.20; // Assuming 20% TVA default
    return taxable + tax;
  };

  const handleCreateQuote = async () => {
    if (quoteItems.length === 0) {
      toast.error('Veuillez ajouter des prestations');
      return;
    }

    const normalizedItems = quoteItems.map((item) => ({
      ...item,
      name: typeof item.name === 'string' ? item.name.trim() : '',
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
    }));

    const invalidItem = normalizedItems.find(
      (i) => !i.name || !Number.isFinite(i.quantity) || i.quantity <= 0 || !Number.isFinite(i.unitPrice) || i.unitPrice <= 0
    );

    if (invalidItem) {
      toast.error('Chaque ligne doit avoir un nom, une quantité > 0 et un prix unitaire > 0.');
      return;
    }

    try {
      setIsCreatingQuote(true);
      await eventService.createQuote(id!, {
        items: normalizedItems,
        serviceFee: Number(serviceFee) || 0,
        deliveryFee: Number(deliveryFee) || 0,
        discount: Number(discount) || 0,
        validDays: Number(validDays) || 30,
        termsConditions: terms
      });
      toast.success('Devis créé avec succès !');
      loadEventDetails();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erreur lors de la création du devis');
    } finally {
      setIsCreatingQuote(false);
    }
  };

  const handleSendQuote = async (quoteId: string) => {
    if (!window.confirm("Envoyer ce devis au client ?")) return;
    try {
      await eventService.sendQuote(quoteId);
      toast.success('Devis envoyé !');
      loadEventDetails();
    } catch (error) {
      toast.error("Erreur lors de l'envoi");
    }
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...quoteItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setQuoteItems(newItems);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!event) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/admin/events')} className="p-2 hover:bg-gray-100 rounded-full transition text-gray-500">
          <ArrowLeftIcon className="h-5 w-5" />
        </button>
        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-2xl font-medium text-gray-900/90">{event.name}</h1>
          <p className="text-gray-400 mt-1">Détails de l'événement et gestion des devis</p>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Event Details */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-card p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Informations Clés</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Statut</p>
                <div className="mt-1"><Badge variant="default">{event.status}</Badge></div>
              </div>
              <div>
                <p className="text-sm text-gray-500">Date</p>
                <p className="font-medium text-gray-900">{new Date(event.eventDate || event.date).toLocaleDateString('fr-FR')}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Type d'Événement</p>
                <p className="font-medium text-gray-900">{event.eventType || event.type}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Nombre de Convives</p>
                <p className="font-medium text-gray-900">{event.guestCount} personnes</p>
              </div>
              {event.location && (
                 <div>
                 <p className="text-sm text-gray-500">Lieu</p>
                 <p className="font-medium text-gray-900">{event.location}</p>
               </div>
              )}
            </div>
          </div>
          
          <div className="glass-card p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Plats Demandés</h2>
            {event.menuItems && event.menuItems.length > 0 ? (
              <ul className="space-y-2">
                {event.menuItems.map(item => (
                  <li key={item.id} className="text-sm flex justify-between p-2 bg-gray-50 rounded-lg">
                    <span>{item.platName}</span>
                    <span className="font-medium text-gray-700">x{item.quantity || event.guestCount}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-400">Aucun plat pré-sélectionné.</p>
            )}
          </div>
        </div>

        {/* Right Column: Quotes Management */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Existing Quotes list */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
              <DocumentPlusIcon className="h-5 w-5 text-gray-400" />
              Devis Émis
            </h2>
            
            {event.quotes && event.quotes.length > 0 ? (
              <div className="space-y-4">
                {event.quotes.map((quote: Quote) => (
                  <div key={quote.id} className="p-4 border border-gray-200 rounded-xl bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-gray-900">{quote.quoteNumber}</span>
                        <Badge variant={quote.status === 'ACCEPTED' ? 'success' : quote.status === 'SENT' ? 'info' : 'default'}>
                          {quote.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500">Montant total: <span className="font-semibold text-primary-600">{quote.totalAmount.toFixed(2)} DT</span></p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                       {quote.status === 'DRAFT' && (
                          <Button size="sm" onClick={() => handleSendQuote(quote.id)}>
                            <PaperAirplaneIcon className="h-4 w-4 mr-1"/> Envoyer
                          </Button>
                       )}
                       {quote.status === 'SENT' && (
                         <span className="text-sm text-gray-400 flex items-center gap-1">
                           <CheckCircleIcon className="h-4 w-4 text-green-500"/> Envoyé
                         </span>
                       )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 mb-4">Aucun devis généré pour cet événement.</p>
            )}
          </div>

          {/* Quote Creation Form */}
          <div className="glass-card p-6 border-t-4 border-primary-500">
            <h2 className="text-lg font-medium text-gray-900 mb-6">📝 Créer un Nouveau Devis</h2>
            
            <div className="space-y-6">
              {/* Items Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700">Prestations</h3>
                  <Button variant="outline" size="sm" onClick={() => setQuoteItems([...quoteItems, { name: '', quantity: 1, unitPrice: '' }])}>
                    + Ajouter Ligne
                  </Button>
                </div>
                
                <div className="space-y-3">
                  {quoteItems.map((item, index) => (
                    <div key={index} className="flex flex-wrap sm:flex-nowrap items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
                      <Input
                        className="flex-1 min-w-[150px]"
                        placeholder="Nom du plat / service"
                        value={item.name}
                        onChange={(e) => updateItem(index, 'name', e.target.value)}
                      />
                      <Input
                        type="number"
                        className="w-24"
                        placeholder="Qté"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', e.target.value === '' ? '' : parseInt(e.target.value))}
                      />
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          className="w-32"
                          placeholder="Prix Un."
                          value={item.unitPrice}
                          onChange={(e) => updateItem(index, 'unitPrice', e.target.value === '' ? '' : parseFloat(e.target.value))}
                        />
                        <span className="text-sm font-bold w-20 text-right">
                          {((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)).toFixed(2)} DT
                        </span>
                      </div>
                      <button 
                         onClick={() => setQuoteItems(quoteItems.filter((_, i) => i !== index))}
                         className="text-red-400 hover:text-red-500 p-2"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  {quoteItems.length === 0 && <p className="text-sm text-gray-500 italic">Aucune prestation. Veuillez en ajouter.</p>}
                </div>
              </div>

              {/* Extras & Totals Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-6 border-t border-gray-100">
                <div className="space-y-4">
                  <Input
                    label="Frais de Service (DT)"
                    type="number"
                    value={serviceFee}
                    onChange={(e) => setServiceFee(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  />
                  <Input
                    label="Frais de Livraison (DT)"
                    type="number"
                    value={deliveryFee}
                    onChange={(e) => setDeliveryFee(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  />
                  <Input
                    label="Remise (DT)"
                    type="number"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  />
                  <Input
                    label="Validité (Jours)"
                    type="number"
                    value={validDays}
                    onChange={(e) => setValidDays(e.target.value === '' ? '' : parseInt(e.target.value))}
                  />
                </div>

                <div className="bg-primary-50 rounded-xl p-5 border border-primary-100">
                  <h3 className="font-semibold text-primary-900 mb-4">Récapitulatif (TVA 20%)</h3>
                  <div className="space-y-2 text-sm text-primary-800">
                    <div className="flex justify-between"><span>Sous-total:</span> <span>{calculateSubtotal().toFixed(2)} DT</span></div>
                    <div className="flex justify-between"><span>Frais Serv.:</span> <span>{Number(serviceFee) > 0 ? `${Number(serviceFee).toFixed(2)} DT` : '-'}</span></div>
                    <div className="flex justify-between"><span>Livraison:</span> <span>{Number(deliveryFee) > 0 ? `${Number(deliveryFee).toFixed(2)} DT` : '-'}</span></div>
                    <div className="flex justify-between font-medium"><span>Remise:</span> <span className="text-green-600">{Number(discount) > 0 ? `-${Number(discount).toFixed(2)} DT` : '-'}</span></div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-primary-200">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-lg text-primary-900">Total TTC:</span>
                      <span className="font-bold text-2xl text-primary-600">{calculateTotal().toFixed(2)} DT</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Terms */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Conditions de vente</label>
                <textarea
                  className="w-full border-gray-200 rounded-lg p-3 text-sm focus:ring-primary-500 focus:border-primary-500"
                  rows={4}
                  value={terms}
                  onChange={e => setTerms(e.target.value)}
                />
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={handleCreateQuote} isLoading={isCreatingQuote}>
                  <DocumentPlusIcon className="h-5 w-5 mr-1" />
                  Générer le Devis
                </Button>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
