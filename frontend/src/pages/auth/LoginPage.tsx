import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Button, Input } from '@/components/ui';
import { authService, type LoginData } from '@/services/auth.service';
import { useAuthStore } from '@/stores/auth.store';
import { useSiteStore } from '@/stores/site.store';
import api from '@/lib/api';

declare global {
  interface Window {
    __gsiInitialized?: boolean;
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          renderButton: (element: HTMLElement, config: any) => void;
        };
      };
    };
  }
}

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((state) => state.login);
  const { config } = useSiteStore();
  const from = (location.state as any)?.from?.pathname || '/dashboard';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginData>();

  // Initialize Google Sign-In
  useEffect(() => {
    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!googleClientId) return;

    const initGoogleButton = () => {
      if (!window.google) return;

      if (!window.__gsiInitialized) {
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleGoogleLogin,
        });
        window.__gsiInitialized = true;
      }

      const buttonDiv = document.getElementById('google-signin-button');
      if (buttonDiv) {
        buttonDiv.innerHTML = '';
        window.google.accounts.id.renderButton(buttonDiv, {
          theme: 'outline',
          size: 'large',
          width: 320,
          text: 'signin_with',
          locale: 'fr',
        });
      }
    };

    const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]') as HTMLScriptElement | null;

    if (existingScript) {
      if (window.google) {
        initGoogleButton();
      } else {
        existingScript.addEventListener('load', initGoogleButton, { once: true });
      }
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.addEventListener('load', initGoogleButton, { once: true });
    document.body.appendChild(script);
  }, []);

  const handleGoogleLogin = async (response: any) => {
    setIsLoading(true);
    try {
      const result = await api.post('/auth/oauth/google', {
        credential: response.credential,
      });
      
      const { user, accessToken, refreshToken } = result.data.data;
      login(user, accessToken, refreshToken);
      toast.success('Connexion Google réussie !');
      
      if (user.role === 'ADMIN') {
        navigate('/admin');
      } else {
        navigate(from);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erreur de connexion Google');
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: LoginData) => {
    setIsLoading(true);
    try {
      const response = await authService.login(data);
      const { user, accessToken, refreshToken } = response.data;
      login(user, accessToken, refreshToken);
      toast.success('Connexion réussie !');
      
      if (user.role === 'ADMIN') {
        navigate('/admin');
      } else {
        navigate(from);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erreur de connexion');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute top-0 left-0 w-72 h-72 bg-primary-500/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-primary-500/3 rounded-full blur-3xl translate-x-1/3 translate-y-1/3" />

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
          <h1 className="font-display text-3xl font-medium text-gray-900">Connexion</h1>
          <p className="mt-2 text-gray-400 font-light">
            Pas encore de compte ?{' '}
            <Link to="/register" className="text-primary-400 hover:text-primary-600 transition-colors">
              S'inscrire
            </Link>
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="glass-card p-8"
        >
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
              label="Mot de passe"
              type="password"
              placeholder="Entrez votre mot de passe"
              error={errors.password?.message}
              {...register('password', {
                required: 'Mot de passe requis',
                minLength: {
                  value: 6,
                  message: 'Minimum 6 caractères',
                },
              })}
            />

            <div className="flex items-center justify-between">
              <label className="flex items-center cursor-pointer">
                <input type="checkbox" className="rounded-md border-gray-200 bg-gray-100 text-primary-500 focus:ring-primary-500/20/20" />
                <span className="ml-2 text-sm text-gray-500 font-light">Se souvenir de moi</span>
              </label>
              <Link to="/forgot-password" className="text-sm text-primary-400/70 hover:text-primary-600 font-light transition-colors">
                Mot de passe oublié ?
              </Link>
            </div>

            <Button type="submit" className="w-full !rounded-xl" isLoading={isLoading}>
              Se connecter
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full h-px bg-gray-100"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-400 font-light text-xs">Ou continuer avec</span>
            </div>
          </div>

          {/* Google Sign-In */}
          <div id="google-signin-button" className="flex justify-center"></div>
        </motion.div>
      </motion.div>
    </div>
  );
}
