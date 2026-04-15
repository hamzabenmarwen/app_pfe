import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Button, Input } from '@/components/ui';
import api from '@/lib/api';
import { useSiteStore } from '@/stores/site.store';

interface ResetPasswordData {
  password: string;
  confirmPassword: string;
}

export default function ResetPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { config } = useSiteStore();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetPasswordData>();

  const password = watch('password');

  useEffect(() => {
    if (!token) {
      toast.error('Lien de réinitialisation invalide');
      navigate('/forgot-password');
    }
  }, [token, navigate]);

  const onSubmit = async (data: ResetPasswordData) => {
    if (!token) return;
    
    setIsLoading(true);
    try {
      await api.post('/auth/reset-password', {
        token,
        password: data.password,
      });
      setIsSuccess(true);
      toast.success('Mot de passe réinitialisé avec succès');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erreur lors de la réinitialisation');
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) return null;

  return (
    <div className="min-h-screen flex items-center justify-center  py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-72 h-72 bg-primary-400/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-secondary-400/10 rounded-full blur-3xl translate-x-1/3 translate-y-1/3" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="max-w-md w-full relative"
      >
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6 group">
            <motion.span
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="text-4xl"
            >🍽️</motion.span>
            <span className="font-display text-2xl font-medium text-gray-900">{config.siteName}</span>
          </Link>
          <h1 className="text-3xl font-medium text-gray-900/90">Nouveau mot de passe</h1>
          <p className="mt-2 text-gray-500">
            Choisissez un nouveau mot de passe sécurisé
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="glass-card p-8"
        >
          {isSuccess ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-medium text-gray-900 mb-2">Mot de passe réinitialisé !</h2>
              <p className="text-gray-500 mb-6">
                Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.
              </p>
              <Link to="/login">
                <Button className="w-full">
                  Se connecter
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <Input
                label="Nouveau mot de passe"
                type="password"
                placeholder="••••••••"
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
                placeholder="••••••••"
                error={errors.confirmPassword?.message}
                {...register('confirmPassword', {
                  required: 'Confirmation requise',
                  validate: (value) =>
                    value === password || 'Les mots de passe ne correspondent pas',
                })}
              />

              <div className="text-sm text-gray-400 space-y-1">
                <p>Le mot de passe doit contenir :</p>
                <ul className="list-disc list-inside space-y-1">
                  <li className={password?.length >= 8 ? 'text-emerald-400' : ''}>Au moins 8 caractères</li>
                  <li className={password && /[A-Z]/.test(password) ? 'text-emerald-400' : ''}>Une lettre majuscule</li>
                  <li className={password && /[a-z]/.test(password) ? 'text-emerald-400' : ''}>Une lettre minuscule</li>
                  <li className={password && /\d/.test(password) ? 'text-emerald-400' : ''}>Un chiffre</li>
                </ul>
              </div>

              <Button type="submit" className="w-full !rounded-xl" isLoading={isLoading}>
                Réinitialiser le mot de passe
              </Button>

              <div className="text-center">
                <Link to="/login" className="text-sm text-primary-400 hover:text-primary-600">
                  Retour à la connexion
                </Link>
              </div>
            </form>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
