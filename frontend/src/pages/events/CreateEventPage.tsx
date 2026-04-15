import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { Button, Input, Card } from '@/components/ui';
import { eventService, type CreateEventData } from '@/services/event.service';
import { useAuthStore } from '@/stores/auth.store';
import toast from 'react-hot-toast';

const EVENT_TYPES = [
  { value: 'WEDDING', label: 'Mariage', emoji: '💒' },
  { value: 'CORPORATE', label: 'Entreprise', emoji: '🏢' },
  { value: 'BIRTHDAY', label: 'Anniversaire', emoji: '🎂' },
  { value: 'COCKTAIL', label: 'Cocktail', emoji: '🍸' },
  { value: 'CONFERENCE', label: 'Conférence', emoji: '📊' },
  { value: 'PRIVATE', label: 'Fête privée', emoji: '🎉' },
  { value: 'OTHER', label: 'Autre', emoji: '📅' },
];

const SERVICE_TYPES = [
  { value: 'BUFFET', label: 'Buffet' },
  { value: 'SEATED', label: 'Service à table' },
  { value: 'COCKTAIL', label: 'Cocktail dînatoire' },
  { value: 'FOOD_TRUCK', label: 'Food truck' },
];

export default function CreateEventPage() {
  const [searchParams] = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState(1);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  const defaultEventType = searchParams.get('type')?.toUpperCase() || '';

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CreateEventData>({
    defaultValues: {
      eventType: defaultEventType,
      guestCount: '' as unknown as number,
      budget: '' as unknown as number,
    },
  });

  const selectedEventType = watch('eventType');

  const onSubmit = async (data: CreateEventData) => {
    if (!isAuthenticated) {
      toast.error('Veuillez vous connecter pour créer un événement');
      navigate('/login?redirect=/events/create');
      return;
    }

    setIsSubmitting(true);
    try {
      await eventService.createEvent(data);
      toast.success('Événement créé avec succès ! Nous vous contacterons bientôt.');
      navigate('/dashboard/events');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erreur lors de la création');
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepLabels = ['Type', 'Détails', 'Contact'];

  return (
    <div className="min-h-screen">
      {/* Hero Header — same style as MenuPage */}
      <div className="relative py-28 lg:py-36 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-50 via-white to-primary-100" />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex items-center justify-center gap-3 mb-6"
          >
            <div className="h-px w-10 bg-gray-200" />
            <span className="text-[10px] uppercase tracking-[0.35em] text-gray-400 font-light">Prestations sur mesure</span>
            <div className="h-px w-10 bg-gray-200" />
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="font-display text-4xl sm:text-6xl font-medium mb-4"
          >
            Votre <span className="italic text-primary-600">événement</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-gray-500 max-w-lg mx-auto font-light"
          >
            Décrivez-nous votre projet et recevez un devis personnalisé sous 24 à 48h.
          </motion.p>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 -mt-16 pb-24 relative z-10">
        <div className="max-w-3xl mx-auto">

          {/* Progress Steps */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex items-center justify-center mb-10"
          >
            {[1, 2, 3].map((s, i) => (
              <div key={s} className="flex items-center">
                <div className="flex flex-col items-center gap-2">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-500 ${
                      step >= s
                        ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {step > s ? '✓' : s}
                  </div>
                  <span className={`text-[10px] uppercase tracking-wider font-light ${step >= s ? 'text-primary-500' : 'text-gray-400'}`}>
                    {stepLabels[i]}
                  </span>
                </div>
                {s < 3 && (
                  <div
                    className={`w-16 sm:w-24 h-px mx-3 mb-5 transition-colors duration-500 ${
                      step > s ? 'bg-primary-400' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Card className="glass-card p-8 sm:p-10">
              <form onSubmit={handleSubmit(onSubmit)}>
                {/* Step 1: Event Type */}
                {step === 1 && (
                  <div className="space-y-8">
                    <div>
                      <h2 className="font-display text-xl font-medium text-gray-900 mb-1">
                        Quel type d'événement organisez-vous ?
                      </h2>
                      <p className="text-sm text-gray-400 font-light">Sélectionnez la catégorie qui correspond le mieux</p>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                      {EVENT_TYPES.map((type) => (
                        <label
                          key={type.value}
                          className={`group cursor-pointer border-2 rounded-2xl p-5 text-center transition-all duration-300 hover:shadow-md ${
                            selectedEventType === type.value
                              ? 'border-primary-500 bg-primary-50/50 shadow-md shadow-primary-500/10'
                              : 'border-gray-100 hover:border-primary-200 bg-white'
                          }`}
                        >
                          <input
                            type="radio"
                            value={type.value}
                            {...register('eventType', { required: 'Sélectionnez un type' })}
                            className="sr-only"
                          />
                          <span className={`text-3xl block mb-3 transition-transform duration-300 ${selectedEventType === type.value ? 'scale-110' : 'group-hover:scale-105'}`}>{type.emoji}</span>
                          <span className={`text-sm font-medium transition-colors ${selectedEventType === type.value ? 'text-primary-600' : 'text-gray-700'}`}>{type.label}</span>
                        </label>
                      ))}
                    </div>
                    {errors.eventType && (
                      <p className="text-red-400 text-sm">{errors.eventType.message}</p>
                    )}
                    <div className="flex justify-end pt-2">
                      <Button
                        type="button"
                        onClick={() => selectedEventType && setStep(2)}
                        disabled={!selectedEventType}
                        className="!rounded-full px-8"
                      >
                        Continuer →
                      </Button>
                    </div>
                  </div>
                )}

                {/* Step 2: Event Details */}
                {step === 2 && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="font-display text-xl font-medium text-gray-900 mb-1">
                        Détails de votre événement
                      </h2>
                      <p className="text-sm text-gray-400 font-light">Renseignez les informations clés pour votre devis</p>
                    </div>

                    <Input
                      label="Nom de l'événement"
                      placeholder="Ex: Mariage de Sophie et Pierre"
                      error={errors.name?.message}
                      {...register('name', { required: 'Nom requis' })}
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input
                        label="Date de l'événement"
                        type="date"
                        error={errors.eventDate?.message}
                        {...register('eventDate', { required: 'Date requise' })}
                      />
                      <Input
                        label="Nombre d'invités"
                        type="number"
                        min="1"
                        placeholder="50"
                        error={errors.guestCount?.message}
                        {...register('guestCount', {
                          required: 'Nombre requis',
                          valueAsNumber: true,
                          min: { value: 1, message: 'Minimum 1 invité' },
                        })}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input
                        label="Heure de début"
                        type="time"
                        {...register('startTime')}
                      />
                      <Input
                        label="Heure de fin"
                        type="time"
                        {...register('endTime')}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Type de service
                      </label>
                      <select
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 bg-white transition-all"
                        {...register('serviceType')}
                      >
                        <option value="">Sélectionnez un type</option>
                        {SERVICE_TYPES.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input
                        label="Budget estimé (DT)"
                        type="number"
                        placeholder="5000"
                        {...register('budget', { valueAsNumber: true })}
                      />
                      <div className="flex items-end pb-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            {...register('budgetFlexible')}
                            className="rounded border-gray-200 text-primary-500 focus:ring-primary-500/20"
                          />
                          <span className="text-sm text-gray-600 font-light">Budget flexible</span>
                        </label>
                      </div>
                    </div>

                    <div className="flex justify-between pt-2">
                      <Button type="button" variant="ghost" onClick={() => setStep(1)} className="!rounded-full px-6">
                        ← Retour
                      </Button>
                      <Button type="button" onClick={() => setStep(3)} className="!rounded-full px-8">
                        Continuer →
                      </Button>
                    </div>
                  </div>
                )}

                {/* Step 3: Contact & Submit */}
                {step === 3 && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="font-display text-xl font-medium text-gray-900 mb-1">
                        Coordonnées et informations complémentaires
                      </h2>
                      <p className="text-sm text-gray-400 font-light">Pour vous recontacter avec votre devis personnalisé</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input
                        label="Nom du contact"
                        placeholder="Jean Dupont"
                        {...register('contactName')}
                      />
                      <Input
                        label="Téléphone"
                        type="tel"
                        placeholder="+216 XX XXX XXX"
                        {...register('contactPhone')}
                      />
                    </div>

                    <Input
                      label="Email de contact"
                      type="email"
                      placeholder="jean@exemple.com"
                      {...register('contactEmail')}
                    />

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">
                        Description / Demandes spéciales
                      </label>
                      <textarea
                        rows={4}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 bg-white transition-all placeholder:text-gray-400"
                        placeholder="Décrivez votre événement, vos attentes, restrictions alimentaires..."
                        {...register('description')}
                      />
                    </div>

                    <div className="bg-primary-50/60 border border-primary-100 rounded-2xl p-5">
                      <p className="text-sm text-primary-700 font-light leading-relaxed">
                        📋 Après soumission, notre équipe vous contactera sous <strong className="font-medium">24 à 48h</strong> pour
                        discuter de votre projet et vous envoyer un devis personnalisé.
                      </p>
                    </div>

                    <div className="flex justify-between pt-2">
                      <Button type="button" variant="ghost" onClick={() => setStep(2)} className="!rounded-full px-6">
                        ← Retour
                      </Button>
                      <Button type="submit" isLoading={isSubmitting} className="!rounded-full px-8">
                        Envoyer ma demande
                      </Button>
                    </div>
                  </div>
                )}
              </form>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
