import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowRightIcon, ArrowDownIcon } from '@heroicons/react/24/outline';
import { Button, FadeIn, StaggerContainer, StaggerItem, AnimatedCounter, FloatingShape } from '@/components/ui';
import { useSiteStore } from '@/stores/site.store';
import RecommendationsSection from '@/components/recommendations/RecommendationsSection';
import PlatsDuJour from '@/components/home/PlatsDuJour';
import { catalogService, type Plat } from '@/services/catalog.service';


const stats = [
  { value: 500, suffix: '+', label: 'Événements réalisés' },
  { value: 15000, suffix: '+', label: 'Clients satisfaits' },
  { value: 50, suffix: '+', label: 'Plats au menu' },
  { value: 4.9, suffix: '/5', label: 'Note moyenne' },
];

const marqueeWords = [
  '{{SITE_NAME}}', '·', 'Héritage Culinaire', '·', 'Traiteur Haut de Gamme', '·',
  'Expérience Premium', '·', 'Événements Privés', '·', 'Corporate', '·',
];

export default function HomePage() {
  const { config } = useSiteStore();
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.8], [1, 0.95]);
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 100]);

  // Fetch signature dishes dynamically from catalog
  const { data: signaturePlats } = useQuery<Plat[]>({
    queryKey: ['signature-plats'],
    queryFn: async () => {
      const res = await catalogService.getPlats({ limit: 50 });
      const allPlats = res?.data || res || [];
      if (!Array.isArray(allPlats)) return [];
      // Pick 5 random-ish dishes with good variety, preferring available ones
      return allPlats
        .filter((p: Plat) => p.isAvailable)
        .slice(0, 5);
    },
    staleTime: 10 * 60 * 1000,
  });

  const signatureDishes = (signaturePlats || []).map((p, i) => ({
    id: p.id,
    name: p.name.toUpperCase(),
    tag: i === 0 ? 'Signature' : i === 1 ? 'Choix du chef' : i === 2 ? 'Classique' : i === 3 ? 'Prestige' : 'Traditionnel',
    img: p.image || null,
    fallbackEmoji: ['🥘', '🍖', '🥟', '🔥', '🍲'][i] || '🍽️',
  }));

  return (
    <div className="overflow-hidden grain-overlay">

      {/* ============ HERO — FULL SCREEN CINEMATIC ============ */}
      <section ref={heroRef} className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-50 via-white to-primary-100" />

        <FloatingShape className="w-[36rem] h-[36rem] bg-primary-500/8 -top-40 -right-32" delay={0} />
        <FloatingShape className="w-[28rem] h-[28rem] bg-primary-400/6 -bottom-28 -left-20" delay={2.5} />
        <FloatingShape className="w-[20rem] h-[20rem] bg-primary-300/5 top-1/3 right-1/4" delay={4} />

        <motion.div
          style={{ opacity: heroOpacity, scale: heroScale, y: heroY }}
          className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center max-w-5xl"
        >
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="flex items-center justify-center gap-3 mb-8"
          >
            <div className="h-px w-12 bg-gray-300" />
            <span className="text-[11px] sm:text-xs uppercase tracking-[0.35em] text-gray-400 font-light">
              Depuis 2020 — Sfax, Tunisie
            </span>
            <div className="h-px w-12 bg-gray-300" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="font-display text-5xl sm:text-7xl lg:text-[6.5rem] font-medium leading-[0.92] tracking-[-0.02em] mb-8 text-gray-900"
          >
            <span className="block">L&apos;art de la</span>
            <span className="block italic text-primary-500">table tunisienne</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.7 }}
            className="max-w-2xl mx-auto text-base sm:text-lg text-gray-500 leading-relaxed font-light mb-12"
          >
            Direction culinaire haut de gamme pour mariages, événements corporate et
            célébrations privées. Du concept jusqu&apos;au dernier invité.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.9 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link to="/events/create">
              <Button size="lg" className="!rounded-full px-10 pulse-glow">
                Réserver une consultation
                <ArrowRightIcon className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/menu">
              <Button variant="outline" size="lg" className="!rounded-full px-10 !border-gray-300 !text-gray-600 hover:!bg-gray-50 hover:!text-gray-900">
                Explorer le menu
              </Button>
            </Link>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="flex flex-col items-center gap-2"
          >
            <span className="text-[10px] uppercase tracking-[0.3em] text-gray-400">Défiler</span>
            <ArrowDownIcon className="h-3.5 w-3.5 text-gray-400" />
          </motion.div>
        </motion.div>
      </section>

      {/* ============ DOUBLE MARQUEE BAND ============ */}
      <section className="marquee-wrap py-1">
        <div className="marquee-track">
          {Array.from({ length: 3 }).map((_, row) => (
            <div key={row} className="flex items-center">
              {marqueeWords.map((label, i) => (
                <span key={`${row}-${i}`} className="marquee-item">{label === '{{SITE_NAME}}' ? config.siteName : label}</span>
              ))}
            </div>
          ))}
        </div>
        <div className="marquee-track-reverse mt-0">
          {Array.from({ length: 3 }).map((_, row) => (
            <div key={row} className="flex items-center">
              {[...marqueeWords].reverse().map((label, i) => (
                <span key={`r-${row}-${i}`} className="marquee-item">{label === '{{SITE_NAME}}' ? config.siteName : label}</span>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* ============ PLATS DU JOUR ============ */}
      <PlatsDuJour />

      {/* ============ EDITORIAL — Heritage Meets Cuisine ============ */}
      <section className="py-32 lg:py-40">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
            <FadeIn direction="left" className="order-2 lg:order-1">
              <div className="section-divider mb-8">
                <span className="text-[10px] uppercase tracking-[0.35em] text-gray-400 font-light whitespace-nowrap">Notre philosophie</span>
              </div>
              <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-medium leading-[1.1] mb-8">
              L&apos;héritage culturel
              <br />
              <span className="italic text-primary-500">au service de l&apos;excellence culinaire</span>
            </h2>
              <p className="text-gray-500 leading-relaxed mb-6 text-base">
                Nous superposons les épices tunisiennes, la précision française et les
                produits de saison locaux dans des plats à la fois familiers et audacieux.
                Chaque assiette raconte une histoire.
              </p>
              <p className="text-gray-500 leading-relaxed mb-10 text-base">
                Notre parcours de six services trace le chemin du chef, de la Médina de Sfax aux
                cuisines du monde, fini avec la chaleur méditerranéenne et des vins choisis au moment parfait.
              </p>
              <Link to="/menu">
                <Button variant="outline" className="!rounded-full !border-gray-300 !text-gray-600 hover:!bg-gray-50 hover:!text-gray-900">
                  Découvrir le menu
                  <ArrowRightIcon className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </FadeIn>

            <FadeIn direction="right" className="order-1 lg:order-2">
              <div className="grid grid-cols-2 gap-4">
                {stats.map((stat, index) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1, duration: 0.5 }}
                    className="glass-card p-6 sm:p-8 text-center"
                  >
                    <p className="text-3xl sm:text-4xl font-display font-medium text-primary-600 mb-2">
                      <AnimatedCounter value={typeof stat.value === 'number' ? stat.value : 0} suffix={stat.suffix} />
                    </p>
                    <p className="text-xs sm:text-sm text-gray-400 font-light">{stat.label}</p>
                  </motion.div>
                ))}
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* ============ SIGNATURE DISHES ============ */}
      <section className="pt-8 pb-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn className="text-center mb-16">
            <div className="section-divider mb-6 max-w-xs mx-auto">
              <span className="text-[10px] uppercase tracking-[0.35em] text-gray-400 font-light whitespace-nowrap">Signature</span>
            </div>
            <h2 className="font-display text-3xl sm:text-5xl font-medium">
              Nos <span className="italic text-primary-500">plats signatures</span>
            </h2>
          </FadeIn>

          <StaggerContainer className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-5">
            {signatureDishes.map((dish, index) => (
              <StaggerItem key={`${dish.id}-${index}`}>
                <Link to="/menu">
                  <motion.div
                    whileHover={{ y: -6, scale: 1.02 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                    className="group glass-card overflow-hidden aspect-[3/4] flex flex-col items-center justify-center text-center cursor-pointer relative"
                  >
                    {dish.img ? (
                      <>
                        <div className="absolute inset-0">
                          <img src={dish.img} alt={dish.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                        </div>
                        <div className="relative z-10 mt-auto p-5">
                          <span className="text-[10px] uppercase tracking-[0.25em] text-primary-300 mb-2 font-light block">{dish.tag}</span>
                          <h3 className="font-display text-sm sm:text-base font-medium text-white group-hover:text-primary-300 transition-colors">{dish.name}</h3>
                        </div>
                      </>
                    ) : (
                      <div className="p-6 flex flex-col items-center justify-center h-full">
                        <span className="text-5xl sm:text-6xl mb-5 group-hover:scale-110 transition-transform duration-500">{dish.fallbackEmoji}</span>
                        <span className="text-[10px] uppercase tracking-[0.25em] text-primary-400/70 mb-2 font-light">{dish.tag}</span>
                        <h3 className="font-display text-sm sm:text-base font-medium text-gray-900 group-hover:text-primary-600 transition-colors">{dish.name}</h3>
                      </div>
                    )}
                  </motion.div>
                </Link>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* ============ AI RECOMMENDATIONS ============ */}
      <section className="pb-8 pt-4">
        <RecommendationsSection />
      </section>

      {/* ============ EVENT TYPES ============ */}
      <section className="py-28 lg:py-36">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn className="text-center mb-16">
            <div className="section-divider mb-6 max-w-xs mx-auto">
              <span className="text-[10px] uppercase tracking-[0.35em] text-gray-400 font-light whitespace-nowrap">Formats</span>
            </div>
            <h2 className="font-display text-3xl sm:text-5xl font-medium mb-4">
              Conçu pour
              <span className="italic text-primary-500"> chaque occasion</span>
            </h2>
            <p className="text-gray-400 max-w-xl mx-auto font-light">
              Du dîner intime au gala de 500 couverts, chaque format est pensé sur mesure.
            </p>
          </FadeIn>

          <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { name: 'Mariages', emoji: '💒', description: 'Rendez votre jour spécial inoubliable' },
              { name: 'Corporate', emoji: '🏢', description: 'Impressionnez vos clients et partenaires' },
              { name: 'Anniversaires', emoji: '🎂', description: 'Célébrez avec style et saveurs' },
              { name: 'Cocktails', emoji: '🍸', description: 'Des moments conviviaux réussis' },
            ].map((event) => (
              <StaggerItem key={event.name}>
                <Link to={`/events/create?type=${event.name.toLowerCase()}`}>
                  <motion.div
                    whileHover={{ y: -5 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                    className="glass-card p-7 h-full group"
                  >
                    <span className="text-4xl block mb-5 group-hover:scale-110 transition-transform duration-500">{event.emoji}</span>
                    <h3 className="font-display text-lg font-medium text-gray-900 mb-2 group-hover:text-primary-600 transition-colors">{event.name}</h3>
                    <p className="text-sm text-gray-400 leading-relaxed mb-5 font-light">{event.description}</p>
                    <span className="inline-flex items-center text-primary-400/60 text-xs uppercase tracking-wider group-hover:text-primary-600 transition-colors">
                      Démarrer
                      <ArrowRightIcon className="ml-1.5 h-3 w-3" />
                    </span>
                  </motion.div>
                </Link>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* ============ MARQUEE BAND 2 ============ */}
      <section className="marquee-wrap">
        <div className="marquee-track">
          {Array.from({ length: 3 }).map((_, row) => (
            <div key={row} className="flex items-center">
              {['Traiteur Premium', '·', 'Sfax', '·', 'Événements', '·', 'Cuisine Raffinée', '·', 'Sur Mesure', '·'].map((label, i) => (
                <span key={`b2-${row}-${i}`} className="marquee-item">{label}</span>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* ============ CTA ============ */}
      <section className="py-32 lg:py-40">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn className="text-center max-w-3xl mx-auto">
            <div className="section-divider mb-8 max-w-xs mx-auto">
              <span className="text-[10px] uppercase tracking-[0.35em] text-gray-400 font-light whitespace-nowrap">Prochaine étape</span>
            </div>
            <h2 className="font-display text-4xl sm:text-6xl lg:text-7xl font-medium leading-[0.95] mb-8">
              Donnez une signature
              <br />
              <span className="italic text-primary-500">culinaire</span>
            </h2>
            <p className="text-gray-500 mb-12 text-base sm:text-lg font-light max-w-xl mx-auto">
              Une équipe dédiée, des propositions sur-mesure, un rendu premium sur chaque détail.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link to="/events/create">
                <Button size="lg" className="!rounded-full px-10">
                  Commencer
                  <ArrowRightIcon className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/contact">
                <Button variant="outline" size="lg" className="!rounded-full px-10 !border-gray-300 !text-gray-600 hover:!bg-gray-50 hover:!text-gray-900">
                  Nous contacter
                </Button>
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>
    </div>
  );
}
