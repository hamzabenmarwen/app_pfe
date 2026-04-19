import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Button, Input } from '@/components/ui';
import { authService, type RegisterData } from '@/services/auth.service';
import { useSiteStore } from '@/stores/site.store';

interface RegisterFormData extends RegisterData {
  confirmPassword: string;
}

export default function RegisterPage() {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { config } = useSiteStore();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>();

  const password = watch('password');

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    try {
      const { confirmPassword, ...registerData } = data;
      await authService.register(registerData);
      toast.success(`Inscription réussie ! Entrez le code reçu par email pour vérifier votre compte.`);
      navigate(`/verify-email?email=${encodeURIComponent(registerData.email)}`);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erreur lors de l\'inscription');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-primary-500/5 rounded-full blur-3xl translate-x-1/3 -translate-y-1/3" />
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-primary-500/3 rounded-full blur-3xl -translate-x-1/3 translate-y-1/3" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="max-w-md w-full relative"
      >
        <div className="text-center mb-8">
          <Link to="/" className="inline-block mb-6">
            <span className="font-display text-2xl font-medium text-gray-900">{config.siteName}</span>
          </Link>
          <h1 className="font-display text-3xl font-medium text-gray-900">Créer un compte</h1>
          <p className="mt-2 text-gray-400 font-light">
            Déjà inscrit ?{' '}
            <Link to="/login" className="text-primary-400 hover:text-primary-600 transition-colors">
              Se connecter
            </Link>
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="glass-card p-8"
        >
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Prénom"
                placeholder="Jean"
                error={errors.firstName?.message}
                {...register('firstName', {
                  required: 'Prénom requis',
                })}
              />
              <Input
                label="Nom"
                placeholder="Dupont"
                error={errors.lastName?.message}
                {...register('lastName', {
                  required: 'Nom requis',
                })}
              />
            </div>

            <Input
              label="Email"
              type="email"
              placeholder="vous@exemple.com"
              error={errors.email?.message}
              {...register('email', {
                required: 'Email requis',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Email invalide',
                },
              })}
            />

            <Input
              label="Téléphone (optionnel)"
              type="tel"
              placeholder="+216 XX XXX XXX"
              error={errors.phone?.message}
              {...register('phone')}
            />

            <Input
              label="Mot de passe"
              type="password"
              placeholder="Entrez votre mot de passe"
              error={errors.password?.message}
              {...register('password', {
                required: 'Mot de passe requis',
                minLength: {
                  value: 8,
                  message: 'Minimum 8 caractères',
                },
                pattern: {
                  value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                  message: 'Doit contenir une majuscule, une minuscule et un chiffre',
                },
              })}
            />

            <Input
              label="Confirmer le mot de passe"
              type="password"
              placeholder="Confirmez votre mot de passe"
              error={errors.confirmPassword?.message}
              {...register('confirmPassword', {
                required: 'Confirmation requise',
                validate: (value) => value === password || 'Les mots de passe ne correspondent pas',
              })}
            />

            <div className="flex items-start">
              <input
                type="checkbox"
                required
                className="mt-1 rounded-md border-gray-200 bg-gray-100 text-primary-500 focus:ring-primary-500/20/20"
              />
              <span className="ml-2 text-sm text-gray-500 font-light">
                J'accepte les{' '}
                <Link to="/terms" className="text-primary-400/80 hover:text-primary-600 transition-colors">
                  conditions d'utilisation
                </Link>{' '}
                et la{' '}
                <Link to="/privacy" className="text-primary-400/80 hover:text-primary-600 transition-colors">
                  politique de confidentialité
                </Link>
              </span>
            </div>

            <Button type="submit" className="w-full !rounded-xl" isLoading={isLoading}>
              S'inscrire
            </Button>
          </form>
        </motion.div>
      </motion.div>
    </div>
  );
}
