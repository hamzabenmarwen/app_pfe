import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { MapPinIcon, BanknotesIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { useCartStore } from '@/stores/cart.store';
import { orderService } from '@/services/order.service';
import { paymentService } from '@/services/payment.service';
import { Button, Input } from '@/components/ui';
import toast from 'react-hot-toast';

interface CheckoutFormData {
  deliveryAddress: string;
  city: string;
  postalCode: string;
  notes?: string;
  paymentMethod: 'CASH' | 'FLOUCI';
}

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { items, total, clearCart } = useCartStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CheckoutFormData>({
    defaultValues: {
      paymentMethod: 'CASH',
    },
  });

  const subtotal = total();
  const deliveryFee = items.length > 0 ? 5.0 : 0;
  const tax = subtotal * 0.19;
  const totalAmount = subtotal + deliveryFee + tax;

  // Professional catering: minimum 48h lead time
  const MIN_LEAD_HOURS = 48;
  const MIN_ORDER_AMOUNT = 30;
  const isBelowMinimum = subtotal < MIN_ORDER_AMOUNT;

  const getAutomaticDeliveryDate = () => {
    const autoDate = new Date();
    autoDate.setHours(autoDate.getHours() + MIN_LEAD_HOURS + 2);
    autoDate.setMinutes(0, 0, 0);
    return autoDate;
  };

  const onSubmit = async (data: CheckoutFormData) => {
    if (items.length === 0) {
      toast.error('Votre panier est vide');
      return;
    }

    if (isBelowMinimum) {
      toast.error(`Commande minimum de ${MIN_ORDER_AMOUNT} DT requise`);
      return;
    }

    await processOrder(data);
  };

  const processOrder = async (data: CheckoutFormData) => {
    setIsSubmitting(true);
    try {
      const orderData = {
        items: items.map((item) => ({
          platId: item.platId,
          quantity: item.quantity,
        })),
        deliveryAddress: {
          street: data.deliveryAddress,
          city: data.city,
          zipCode: data.postalCode,
          country: 'Tunisie',
        },
        deliveryDate: getAutomaticDeliveryDate().toISOString(),
        notes: data.notes,
        paymentMethod: data.paymentMethod,
      };

      const response = await orderService.createOrder(orderData);

      if (data.paymentMethod === 'FLOUCI') {
        const flouciResult = await paymentService.initiateFlouci(response.data.id);
        if (flouciResult.data?.paymentUrl) {
          clearCart();
          toast.success('Redirection vers Flouci...');
          window.location.href = flouciResult.data.paymentUrl;
          return;
        }
      }

      clearCart();
      toast.success('Commande passée avec succès !');
      navigate(`/dashboard/orders/${response.data.id}`);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erreur lors de la commande');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <motion.span
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            className="text-7xl block mb-4"
          >🛒</motion.span>
          <h1 className="text-2xl font-medium text-gray-900/90 mb-2">Votre panier est vide</h1>
          <p className="text-gray-500 mb-6">Ajoutez des plats avant de commander</p>
          <Button onClick={() => navigate('/menu')} className="!rounded-xl">Voir le menu</Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent py-8 pb-28 lg:pb-8">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl font-medium text-gray-900/90 mb-8"
        >Finaliser la commande</motion.h1>

          {/* Lead time notice */}
          <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 mb-6">
            <ExclamationTriangleIcon className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-amber-800">Délai de commande : {MIN_LEAD_HOURS}h minimum</p>
              <p className="text-amber-600">Les commandes traiteur nécessitent un délai de préparation. Commande minimum : {MIN_ORDER_AMOUNT} DT. La date et l'heure exactes seront confirmées après validation.</p>
            </div>
          </div>

          {isBelowMinimum && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200 mb-6">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-red-800">Montant insuffisant</p>
                <p className="text-red-600">Votre commande est de {subtotal.toFixed(2)} DT. Le minimum requis est de {MIN_ORDER_AMOUNT} DT.</p>
              </div>
            </div>
          )}

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Form Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="lg:col-span-2 space-y-6"
            >
              {/* Delivery Address */}
              <div className="glass-card p-6 hover:shadow-lg hover:shadow-black/10 transition-shadow">
                <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <MapPinIcon className="h-5 w-5 text-primary-400" />
                  Adresse de livraison
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Input
                      label="Adresse"
                      placeholder="Votre adresse de livraison"
                      {...register('deliveryAddress', { required: 'Adresse requise' })}
                      error={errors.deliveryAddress?.message}
                    />
                  </div>
                  <Input
                    label="Ville"
                    placeholder="Sfax"
                    {...register('city', { required: 'Ville requise' })}
                    error={errors.city?.message}
                  />
                  <Input
                    label="Code postal"
                    placeholder="3000"
                    {...register('postalCode', {
                      required: 'Code postal requis',
                      pattern: {
                        value: /^[0-9]{4}$/,
                        message: 'Code postal invalide',
                      },
                    })}
                    error={errors.postalCode?.message}
                  />
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes (optionnel)
                  </label>
                  <textarea
                    {...register('notes')}
                    placeholder="Instructions spéciales, code d'accès, etc."
                    rows={3}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 bg-white/80 placeholder:text-gray-400"
                  />
                </div>
              </div>

              {/* Payment Method */}
              <div className="glass-card p-6 hover:shadow-lg hover:shadow-black/10 transition-shadow">
                <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <BanknotesIcon className="h-5 w-5 text-primary-400" />
                  Mode de paiement
                </h2>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 p-4 border border-primary-400 rounded-xl cursor-pointer bg-primary-500/5">
                    <input
                      type="radio"
                      value="CASH"
                      {...register('paymentMethod')}
                      defaultChecked
                      className="w-4 h-4 text-primary-400 focus:ring-primary-500/20"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">Espèces</p>
                      <p className="text-sm text-gray-400">Paiement à la livraison</p>
                    </div>
                    <span className="text-2xl">💵</span>
                  </label>


                  <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-xl cursor-pointer hover:border-primary-300 transition-colors">
                    <input
                      type="radio"
                      value="FLOUCI"
                      {...register('paymentMethod')}
                      className="w-4 h-4 text-primary-400 focus:ring-primary-500/20"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">Flouci</p>
                      <p className="text-sm text-gray-400">Paiement en ligne sécurisé (Tunisie)</p>
                    </div>
                    <span className="text-2xl">🇹🇳</span>
                  </label>

                </div>
                {errors.paymentMethod && (
                  <p className="text-red-500 text-sm mt-2">{errors.paymentMethod.message}</p>
                )}
              </div>
            </motion.div>

            {/* Order Summary */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="lg:col-span-1"
            >
              <div className="glass-card p-6 lg:sticky lg:top-24">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Votre commande</h2>

                {/* Items */}
                <div className="space-y-3 mb-4">
                  {items.map((item) => (
                    <div key={item.platId} className="flex justify-between text-sm">
                      <span className="text-gray-500">
                        {item.quantity}x {item.platName}
                      </span>
                      <span className="font-medium">
                        {(item.unitPrice * item.quantity).toFixed(2)} DT
                      </span>
                    </div>
                  ))}
                </div>

                <hr className="my-4" />

                {/* Totals */}
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-gray-500">
                    <span>Sous-total</span>
                    <span>{subtotal.toFixed(2)} DT</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>Frais de livraison</span>
                    <span>{deliveryFee.toFixed(2)} DT</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>TVA (19%)</span>
                    <span>{tax.toFixed(2)} DT</span>
                  </div>
                  <hr />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span className="text-primary-400">{totalAmount.toFixed(2)} DT</span>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="hidden lg:flex w-full !rounded-xl"
                  disabled={isSubmitting}
                  isLoading={isSubmitting}
                >
                  {isSubmitting ? 'Traitement...' : 'Confirmer la commande'}
                </Button>

                <p className="text-xs text-gray-400 text-center mt-4">
                  En confirmant, vous acceptez nos conditions générales de vente
                </p>
              </div>
            </motion.div>
          </div>

          <div className="lg:hidden fixed bottom-0 inset-x-0 z-30 border-t border-gray-200 bg-white/95 backdrop-blur-xl px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">Total</span>
              <span className="text-lg font-bold text-primary-400">{totalAmount.toFixed(2)} DT</span>
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting}
              isLoading={isSubmitting}
            >
              {isSubmitting ? 'Traitement...' : 'Confirmer la commande'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
