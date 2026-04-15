import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { MapPinIcon, PhoneIcon, EnvelopeIcon, ClockIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';
import { Input, Button } from '@/components/ui';
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/ui/motion';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useSiteStore } from '@/stores/site.store';

interface ContactFormData {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}

const contactInfo = [
  {
    icon: MapPinIcon,
    title: 'Adresse',
    lines: ['{{SITE_ADDRESS}}'],
  },
  {
    icon: PhoneIcon,
    title: 'Téléphone',
    lines: ['{{SITE_PHONE}}'],
  },
  {
    icon: EnvelopeIcon,
    title: 'Email',
    lines: ['{{SITE_EMAIL}}'],
  },
  {
    icon: ClockIcon,
    title: 'Horaires',
    lines: ['Lun–Ven : 11h–20h', 'Sam–Dim : Fermé (sauf événements)'],
  },
];

export default function ContactPage() {
  const { config } = useSiteStore();
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactFormData>();

  const onSubmit = async (data: ContactFormData) => {
    try {
      setSubmitting(true);
      await api.post('/contact', data);
      toast.success('Message envoyé avec succès !');
      reset();
    } catch {
      toast.error("Erreur lors de l'envoi du message");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="relative py-28 lg:py-36 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-50 via-white to-primary-100" />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex items-center justify-center gap-3 mb-6"
          >
            <div className="h-px w-10 bg-gray-300" />
            <span className="text-[10px] uppercase tracking-[0.35em] text-gray-400 font-light">Contact</span>
            <div className="h-px w-10 bg-gray-300" />
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="font-display text-4xl sm:text-6xl font-medium text-gray-900 mb-4"
          >
            Parlons de votre <span className="italic text-primary-500">projet</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-gray-500 max-w-lg mx-auto font-light"
          >
            Une question, un devis, un événement ? Nous sommes à votre écoute.
          </motion.p>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Contact Info Grid */}
        <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
          {contactInfo.map((info, i) => (
            <StaggerItem key={i}>
              <motion.div
                whileHover={{ y: -4 }}
                transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                className="glass-card p-6 text-center h-full"
              >
                <div className="w-10 h-10 rounded-full bg-primary-500/10 flex items-center justify-center mx-auto mb-4">
                  <info.icon className="w-4 h-4 text-primary-400" />
                </div>
                <h3 className="text-xs uppercase tracking-[0.18em] text-gray-500 mb-3 font-light">{info.title}</h3>
                {info.lines.map((line, j) => (
                  <p key={j} className="text-sm text-gray-400 font-light leading-relaxed">
                    {line.replace('{{SITE_ADDRESS}}', config.siteAddress).replace('{{SITE_PHONE}}', config.sitePhone).replace('{{SITE_EMAIL}}', config.siteEmail)}
                  </p>
                ))}
              </motion.div>
            </StaggerItem>
          ))}
        </StaggerContainer>

        {/* Social media */}
        <FadeIn className="mb-16">
          <div className="glass-card p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-display text-lg font-medium text-gray-900 mb-1">Retrouvez-nous sur les réseaux</h3>
              <p className="text-sm text-gray-400 font-light">Nos plats du jour sont publiés quotidiennement sur Facebook</p>
            </div>
            <div className="flex gap-3">
              <a
                href="https://www.facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1877F2] text-white text-sm font-medium hover:bg-[#1565c0] transition-all shadow-sm hover:shadow-md"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                Facebook
              </a>
              <a
                href="https://www.instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-medium hover:from-purple-600 hover:to-pink-600 transition-all shadow-sm hover:shadow-md"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                Instagram
              </a>
            </div>
          </div>
        </FadeIn>

        {/* Contact Form */}
        <FadeIn>
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="font-display text-2xl sm:text-3xl font-medium mb-2">
                Envoyez-nous un <span className="italic text-primary-600">message</span>
              </h2>
              <p className="text-gray-400 text-sm font-light">
                Nous vous répondrons dans les plus brefs délais.
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="glass-card p-6 sm:p-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
                <Input
                  label="Nom complet"
                  placeholder="Votre nom"
                  {...register('name', { required: 'Le nom est requis' })}
                  error={errors.name?.message}
                />
                <Input
                  label="Email"
                  type="email"
                  placeholder="votre@email.com"
                  {...register('email', {
                    required: "L'email est requis",
                    pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Email invalide' },
                  })}
                  error={errors.email?.message}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
                <Input
                  label="Téléphone"
                  placeholder="+216 XX XXX XXX"
                  {...register('phone')}
                />
                <Input
                  label="Sujet"
                  placeholder="L'objet de votre message"
                  {...register('subject', { required: 'Le sujet est requis' })}
                  error={errors.subject?.message}
                />
              </div>
              <div className="mb-6">
                <label className="block text-[10px] uppercase tracking-[0.15em] text-gray-500 mb-2 font-light">
                  Message
                </label>
                <textarea
                  rows={5}
                  placeholder="Décrivez votre projet ou votre demande..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary-500/20 focus:border-transparent bg-white transition-all duration-300 placeholder:text-gray-400 text-gray-900 text-sm resize-none"
                  {...register('message', { required: 'Le message est requis' })}
                />
                {errors.message && (
                  <p className="text-red-400/80 text-xs mt-1 font-light">{errors.message.message}</p>
                )}
              </div>
              <Button type="submit" isLoading={submitting} className="w-full !rounded-xl">
                <PaperAirplaneIcon className="w-4 h-4 mr-2" />
                Envoyer le message
              </Button>
            </form>
          </div>
        </FadeIn>
      </div>
    </div>
  );
}
