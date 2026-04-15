import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LockClosedIcon, UserPlusIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

interface AuthPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  message?: string;
}

export default function AuthPromptModal({ isOpen, onClose, message }: AuthPromptModalProps) {
  const navigate = useNavigate();

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95 translate-y-4"
              enterTo="opacity-100 scale-100 translate-y-0"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100 translate-y-0"
              leaveTo="opacity-0 scale-95 translate-y-4"
            >
              <Dialog.Panel className="w-full max-w-sm transform overflow-hidden rounded-2xl bg-white/95 backdrop-blur-xl p-8 text-center align-middle shadow-2xl shadow-black/10 border border-gray-200 transition-all">
                {/* Lock Icon */}
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
                  className="mx-auto mb-5 w-16 h-16 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center"
                >
                  <LockClosedIcon className="h-8 w-8 text-primary-600" />
                </motion.div>

                <Dialog.Title as="h3" className="font-display text-xl font-medium text-gray-900 mb-2">
                  Connexion requise
                </Dialog.Title>

                <p className="text-gray-500 text-sm font-light mb-6 leading-relaxed">
                  {message || 'Connectez-vous pour ajouter des plats à votre panier et passer commande.'}
                </p>

                {/* Action Buttons */}
                <div className="space-y-3">
                  <button
                    onClick={() => { onClose(); navigate('/login'); }}
                    className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white font-medium text-sm shadow-lg shadow-primary-500/25 hover:shadow-xl hover:shadow-primary-500/30 hover:from-primary-600 hover:to-primary-700 transition-all duration-300"
                  >
                    Se connecter
                    <ArrowRightIcon className="h-4 w-4" />
                  </button>

                  <button
                    onClick={() => { onClose(); navigate('/register'); }}
                    className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium text-sm hover:bg-gray-50 hover:border-gray-300 transition-all duration-300"
                  >
                    <UserPlusIcon className="h-4 w-4" />
                    Créer un compte
                  </button>
                </div>

                {/* Dismiss */}
                <button
                  onClick={onClose}
                  className="mt-4 text-xs text-gray-400 hover:text-gray-500 transition-colors font-light"
                >
                  Continuer en tant que visiteur
                </button>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
