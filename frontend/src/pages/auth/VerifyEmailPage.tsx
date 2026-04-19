import { useState, useEffect, useRef, type ClipboardEvent, type FormEvent, type KeyboardEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Button, Input } from '@/components/ui';
import { authService } from '@/services/auth.service';
import { useSiteStore } from '@/stores/site.store';
import { useAuthStore } from '@/stores/auth.store';

const OTP_LENGTH = 6;

export default function VerifyEmailPage() {
  const { config } = useSiteStore();
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'form'>('form');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [otpDigits, setOtpDigits] = useState<string[]>(Array.from({ length: OTP_LENGTH }, () => ''));
  const [codeError, setCodeError] = useState('');
  const [isSubmittingCode, setIsSubmittingCode] = useState(false);
  const [isResendingCode, setIsResendingCode] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const emailFromQuery = searchParams.get('email');
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (emailFromQuery) {
      setEmail(emailFromQuery);
    }
  }, [emailFromQuery]);

  useEffect(() => {
    if (resendCooldown <= 0) return;

    const timer = window.setTimeout(() => {
      setResendCooldown((current) => current - 1);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [resendCooldown]);

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setStatus('form');
        return;
      }

      setStatus('loading');
      try {
        await authService.verifyEmailToken(token);
        setStatus('success');
        setMessage('Email vérifié avec succès !');
      } catch (error: any) {
        setStatus('form');
        setMessage(error.response?.data?.error || 'Le lien de vérification est invalide ou a expiré. Utilisez le code reçu par email.');
      }
    };

    verifyEmail();
  }, [token]);

  const handleVerifyCode = async (event: FormEvent) => {
    event.preventDefault();

    const normalizedEmail = email.trim();
    const normalizedCode = otpDigits.join('');

    if (!normalizedEmail) {
      toast.error('Veuillez entrer votre email');
      return;
    }

    if (normalizedCode.length !== 6) {
      setCodeError('Le code doit contenir 6 chiffres');
      toast.error('Le code doit contenir 6 chiffres');
      return;
    }

    setCodeError('');
    setIsSubmittingCode(true);
    try {
      const response = await authService.verifyEmailCode(normalizedEmail, normalizedCode);
      const payload = response?.data;

      if (payload?.user && payload?.accessToken) {
        login(payload.user, payload.accessToken);
        toast.success('Compte vérifié. Redirection en cours...');
        if (payload.user.role === 'ADMIN') {
          navigate('/admin');
        } else {
          navigate('/dashboard');
        }
        return;
      }

      setStatus('success');
      setMessage('Email vérifié avec succès !');
      toast.success('Votre compte est maintenant activé.');
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Code invalide ou expiré';
      setCodeError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSubmittingCode(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    setOtpDigits((previous) => {
      const next = [...previous];
      next[index] = digit;
      return next;
    });

    if (digit && index < OTP_LENGTH - 1) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }

    if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault();
      otpRefs.current[index - 1]?.focus();
    }

    if (event.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      event.preventDefault();
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const pastedDigits = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH).split('');
    if (pastedDigits.length === 0) {
      return;
    }

    const nextDigits = Array.from({ length: OTP_LENGTH }, (_, index) => pastedDigits[index] || '');
    setOtpDigits(nextDigits);
    const focusIndex = Math.min(pastedDigits.length, OTP_LENGTH) - 1;
    otpRefs.current[Math.max(0, focusIndex)]?.focus();
  };

  const handleResendCode = async () => {
    const normalizedEmail = email.trim();

    if (!normalizedEmail) {
      toast.error('Entrez votre email pour recevoir un nouveau code');
      return;
    }

    if (resendCooldown > 0) return;

    setIsResendingCode(true);
    try {
      const response = await authService.resendVerificationCode(normalizedEmail);
      toast.success(response.message || 'Code renvoyé avec succès');
      setResendCooldown(30);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Impossible de renvoyer le code');
    } finally {
      setIsResendingCode(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center  py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-80 h-80 bg-primary-400/10 rounded-full blur-3xl translate-x-1/3 -translate-y-1/3" />

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
          <h1 className="text-3xl font-medium text-gray-900/90">Vérification de l'email</h1>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="glass-card p-8"
        >
          {status === 'loading' && (
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4">
                <svg className="animate-spin h-16 w-16 text-primary-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
              <p className="text-gray-500">Vérification en cours...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-medium text-gray-900 mb-2">{message}</h2>
              <p className="text-gray-500 mb-6">
                Votre adresse email a été vérifiée. Vous pouvez maintenant profiter de toutes les fonctionnalités.
              </p>
              <Link to="/login">
                <Button className="w-full">
                  Se connecter
                </Button>
              </Link>
            </div>
          )}

          {status === 'form' && (
            <div>
              <div className="text-center mb-6">
                <h2 className="text-xl font-medium text-gray-900 mb-2">Entrer le code de vérification</h2>
                <p className="text-gray-500">Un code à 6 chiffres a été envoyé par email.</p>
                {message && (
                  <p className="text-sm text-amber-600 bg-amber-50 rounded-lg px-3 py-2 mt-3">{message}</p>
                )}
              </div>

              <form onSubmit={handleVerifyCode} className="space-y-4">
                <Input
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="vous@exemple.com"
                  autoComplete="email"
                  required
                />

                <div>
                  <label className="block text-xs font-light tracking-wide text-gray-500 mb-2 uppercase">
                    Code à 6 chiffres
                  </label>
                  <div className="flex items-center justify-between gap-2" onPaste={handleOtpPaste}>
                    {otpDigits.map((digit, index) => (
                      <input
                        key={`otp-${index}`}
                        ref={(element) => {
                          otpRefs.current[index] = element;
                        }}
                        type="text"
                        inputMode="numeric"
                        autoComplete={index === 0 ? 'one-time-code' : 'off'}
                        value={digit}
                        onChange={(event) => handleOtpChange(index, event.target.value)}
                        onKeyDown={(event) => handleOtpKeyDown(index, event)}
                        maxLength={1}
                        className="h-12 w-10 rounded-xl border border-gray-200 text-center text-lg font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
                        aria-label={`Chiffre ${index + 1}`}
                      />
                    ))}
                  </div>
                  {codeError && <p className="mt-2 text-sm text-red-500">{codeError}</p>}
                </div>

                <Button type="submit" className="w-full" isLoading={isSubmittingCode}>
                  Vérifier mon email
                </Button>
              </form>

              <div className="mt-4 space-y-3">
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  onClick={handleResendCode}
                  disabled={isResendingCode || resendCooldown > 0}
                  isLoading={isResendingCode}
                >
                  {resendCooldown > 0 ? `Renvoyer dans ${resendCooldown}s` : 'Renvoyer le code'}
                </Button>

                <Link to="/login" className="block">
                  <Button type="button" variant="ghost" className="w-full">
                    Retour à la connexion
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
