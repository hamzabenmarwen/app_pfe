import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { TrashIcon, MinusIcon, PlusIcon, ShoppingBagIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useCartStore } from '@/stores/cart.store';
import { useAuthStore } from '@/stores/auth.store';
import { Button } from '@/components/ui';
import toast from 'react-hot-toast';

export default function CartPage() {
  const navigate = useNavigate();
  const { items, updateQuantity, removeItem, clearCart, total } = useCartStore();
  const { isAuthenticated } = useAuthStore();

  const delivery = 5.0;
  const subtotal = total();
  const tva = subtotal * 0.19;
  const grandTotal = subtotal + delivery + tva;

  const handleCheckout = () => {
    if (!isAuthenticated) {
      toast.error('Veuillez vous connecter pour passer commande');
      navigate('/login');
      return;
    }
    navigate('/checkout');
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-md mx-auto px-4"
        >
          <motion.div
            animate={{ y: [0, -12, 0] }}
            transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
            className="text-7xl mb-6"
          >
            🛒
          </motion.div>
          <h2 className="font-display text-2xl font-medium mb-3 text-gray-900">Votre panier est vide</h2>
          <p className="text-gray-400 font-light mb-8">
            Découvrez notre carte et ajoutez vos plats préférés.
          </p>
          <Link to="/menu">
            <Button>
              <ShoppingBagIcon className="w-4 h-4 mr-2" />
              Voir le menu
            </Button>
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="relative py-24 lg:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-50 via-white to-primary-100" />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex items-center justify-center gap-3 mb-5"
          >
            <div className="h-px w-10 bg-gray-300" />
            <span className="text-[10px] uppercase tracking-[0.35em] text-gray-400 font-light">Commande</span>
            <div className="h-px w-10 bg-gray-300" />
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="font-display text-4xl sm:text-5xl font-medium text-gray-900"
          >
            Votre <span className="italic text-primary-500">panier</span>
          </motion.h1>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <Link
                to="/menu"
                className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-600 transition-colors font-light"
              >
                <ArrowLeftIcon className="w-3.5 h-3.5" />
                Continuer les achats
              </Link>
              <button
                onClick={clearCart}
                className="text-xs text-red-400/60 hover:text-red-400 transition-colors font-light"
              >
                Vider le panier
              </button>
            </div>

            <AnimatePresence mode="popLayout">
              {items.map((item) => (
                <motion.div
                  key={item.platId}
                  layout
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -30, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                  className="glass-card p-4 flex gap-4"
                >
                  <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-gray-50">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.platName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl">🍽️</div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-display text-sm font-medium text-gray-900 truncate">{item.platName}</h3>
                    <p className="text-primary-400/70 text-sm font-light mt-0.5">
                      {item.unitPrice.toFixed(2)} DT
                    </p>

                    <div className="flex items-center gap-3 mt-3">
                      <div className="flex items-center border border-gray-200 rounded-full">
                        <button
                          onClick={() => updateQuantity(item.platId, item.quantity - 1)}
                          className="p-1.5 text-gray-500 hover:text-gray-700 transition-colors"
                        >
                          <MinusIcon className="w-3.5 h-3.5" />
                        </button>
                        <span className="px-3 text-sm font-medium text-gray-800 tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.platId, item.quantity + 1)}
                          className="p-1.5 text-gray-500 hover:text-gray-700 transition-colors"
                        >
                          <PlusIcon className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <button
                        onClick={() => removeItem(item.platId)}
                        className="p-1.5 text-gray-400 hover:text-red-400 transition-colors"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p className="font-display font-medium text-gray-900">
                      {(item.unitPrice * item.quantity).toFixed(2)} DT
                    </p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-card p-6 sticky top-28"
            >
              <h3 className="font-display text-lg font-medium text-gray-900 mb-5">Résumé</h3>

              <div className="space-y-3 mb-5">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400 font-light">Sous-total</span>
                  <span className="text-gray-700">{subtotal.toFixed(2)} DT</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400 font-light">Livraison</span>
                  <span className="text-gray-700">{delivery.toFixed(2)} DT</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400 font-light">TVA (19%)</span>
                  <span className="text-gray-700">{tva.toFixed(2)} DT</span>
                </div>
              </div>

              <div className="hr-editorial mb-5" />

              <div className="flex justify-between items-center mb-6">
                <span className="text-gray-500 font-light">Total</span>
                <span className="font-display text-xl font-medium text-primary-600">
                  {grandTotal.toFixed(2)} DT
                </span>
              </div>

              <Button onClick={handleCheckout} className="w-full !rounded-xl">
                Passer la commande
              </Button>

              <p className="text-center text-[10px] text-gray-400 mt-3 font-light">
                Paiement sécurisé · Livraison estimée 45 min
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
