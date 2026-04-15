import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/ui';
import { useSiteStore } from '@/stores/site.store';

export default function AboutPage() {
  const { config } = useSiteStore();

  return (
    <div className="min-h-screen bg-transparent">
      {/* Hero Header */}
      <div className="relative bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 text-white py-20 overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
          backgroundSize: '32px 32px',
        }} />
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary-400/20 rounded-full blur-3xl" />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl text-center relative">
          <motion.span
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', duration: 0.6 }}
            className="text-6xl block mb-4"
          >
            🍽️
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="font-display text-4xl md:text-5xl font-bold mb-4"
          >
            À propos de {config.siteName}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg text-white/80 max-w-2xl mx-auto"
          >
            Passion, qualité et excellence au service de vos événements
          </motion.p>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl -mt-10 pb-16 relative z-10">
        <div className="glass-card p-8 md:p-12">
          {/* Mission */}
          <FadeIn direction="up" className="mb-12">
            <h2 className="text-2xl font-medium text-gray-900 mb-4 flex items-center gap-3">
              <span className="w-10 h-10 bg-primary-500/10 rounded-lg flex items-center justify-center text-xl">🎯</span>
              Notre Mission
            </h2>
            <p className="text-gray-500 leading-relaxed text-lg">
              {config.siteName} est née de l'idée de créer une expérience traiteur 
              d'excellence à Sfax. Notre mission est de vous offrir des prestations culinaires 
              haut de gamme pour tous vos événements, avec un service personnalisé 
              et une gestion intelligente pilotée par l'IA.
            </p>
          </FadeIn>

          {/* History */}
          <FadeIn direction="up" delay={0.1} className="mb-12">
            <h2 className="text-2xl font-medium text-gray-900 mb-4 flex items-center gap-3">
              <span className="w-10 h-10 bg-primary-500/10 rounded-lg flex items-center justify-center text-xl">📜</span>
              Notre Histoire
            </h2>
            <p className="text-gray-500 leading-relaxed mb-4">
              Fondée à Sfax en 2020, {config.siteName} s'est construite 
              autour d'une passion pour la gastronomie tunisienne authentique. La plateforme 
              allie savoir-faire culinaire et technologies modernes (microservices, IA, temps réel) 
              pour offrir une expérience client exceptionnelle.
            </p>
            <p className="text-gray-500 leading-relaxed">
              Aujourd'hui, nous accompagnons des centaines de clients chaque mois, des mariages 
              intimes aux grands événements d'entreprise, en passant par les réceptions privées.
            </p>
          </FadeIn>

          {/* Values */}
          <FadeIn direction="up" delay={0.2} className="mb-12">
            <h2 className="text-2xl font-medium text-gray-900 mb-6 flex items-center gap-3">
              <span className="w-10 h-10 bg-primary-500/10 rounded-lg flex items-center justify-center text-xl">💎</span>
              Nos Valeurs
            </h2>
            <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { icon: '🌿', title: 'Qualité', desc: 'Produits frais, locaux et de saison sélectionnés avec soin', colors: 'from-green-50 to-emerald-50 border-green-100' },
                { icon: '🎨', title: 'Créativité', desc: 'Des recettes originales qui surprennent et ravissent', colors: 'from-purple-50 to-pink-50 border-purple-100' },
                { icon: '🤝', title: 'Excellence', desc: 'Un service irréprochable du premier contact à votre événement', colors: 'from-blue-50 to-indigo-50 border-blue-100' },
              ].map((v) => (
                <StaggerItem key={v.title}>
                  <motion.div whileHover={{ y: -6, scale: 1.03 }} transition={{ type: 'spring', stiffness: 300 }} className={`text-center p-6 rounded-2xl bg-gradient-to-br ${v.colors} border`}>
                    <span className="text-5xl block mb-4">{v.icon}</span>
                    <h3 className="font-medium text-gray-900/90 mb-2 text-lg">{v.title}</h3>
                    <p className="text-sm text-gray-500">{v.desc}</p>
                  </motion.div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </FadeIn>

          {/* Team */}
          <FadeIn direction="up" delay={0.3} className="mb-12">
            <h2 className="text-2xl font-medium text-gray-900 mb-4 flex items-center gap-3">
              <span className="w-10 h-10 bg-primary-500/10 rounded-lg flex items-center justify-center text-xl">👨‍🍳</span>
              Notre Équipe
            </h2>
            <p className="text-gray-500 leading-relaxed text-lg">
              Notre équipe est composée de chefs expérimentés, de pâtissiers talentueux et 
              de professionnels de l'événementiel dédiés à la réussite de vos projets. 
              Chaque membre apporte son expertise pour vous garantir une prestation parfaite.
            </p>
          </FadeIn>

          {/* Zone de Livraison */}
          <FadeIn direction="up" delay={0.35} className="mb-12">
            <h2 className="text-2xl font-medium text-gray-900 mb-4 flex items-center gap-3">
              <span className="w-10 h-10 bg-primary-500/10 rounded-lg flex items-center justify-center text-xl">🚚</span>
              Zone de Livraison
            </h2>
            <p className="text-gray-500 leading-relaxed mb-6">
              Nous livrons dans toute la région de Sfax et ses environs. Notre service de livraison
              est disponible du lundi au vendredi à partir de 11h.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { zone: 'Centre-ville Sfax', icon: '🏙️' },
                { zone: 'Route Mahdia', icon: '🛣️' },
                { zone: 'Route Tunis', icon: '🛣️' },
                { zone: 'Sakiet Ezzit', icon: '📍' },
                { zone: 'Sakiet Eddaier', icon: '📍' },
                { zone: 'Chihia', icon: '📍' },
                { zone: 'El Ain', icon: '📍' },
                { zone: 'Zones industrielles', icon: '🏭' },
              ].map((z) => (
                <div
                  key={z.zone}
                  className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 border border-gray-100 hover:border-primary-200 hover:bg-primary-50/50 transition-all"
                >
                  <span className="text-base">{z.icon}</span>
                  <span className="text-sm text-gray-600 font-medium">{z.zone}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-3 font-light">
              * Service B2B et événementiel disponible dans tout le gouvernorat de Sfax.
              Contactez-nous pour les livraisons hors zone.
            </p>
          </FadeIn>

          {/* Réseaux sociaux */}
          <FadeIn direction="up" delay={0.38} className="mb-12">
            <h2 className="text-2xl font-medium text-gray-900 mb-4 flex items-center gap-3">
              <span className="w-10 h-10 bg-primary-500/10 rounded-lg flex items-center justify-center text-xl">📱</span>
              Suivez-nous
            </h2>
            <p className="text-gray-500 leading-relaxed mb-4">
              Retrouvez nos plats du jour, nos promotions et nos actualités sur nos réseaux sociaux.
              Notre page Facebook est mise à jour quotidiennement avec le menu du jour.
            </p>
            <div className="flex gap-4">
              <a
                href="https://www.facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-5 py-3 rounded-xl bg-[#1877F2]/10 hover:bg-[#1877F2]/20 border border-[#1877F2]/20 transition-all group"
              >
                <svg className="w-5 h-5 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                <span className="text-sm font-medium text-[#1877F2] group-hover:underline">Page Facebook</span>
              </a>
              <a
                href="https://www.instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-5 py-3 rounded-xl bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/20 transition-all group"
              >
                <svg className="w-5 h-5 text-pink-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                <span className="text-sm font-medium text-pink-500 group-hover:underline">Instagram</span>
              </a>
            </div>
          </FadeIn>

          {/* CTA */}
          <FadeIn direction="up" delay={0.4} className="bg-gradient-to-br from-primary-600 to-primary-800 rounded-2xl p-8 text-center text-white">
            <h2 className="text-2xl font-bold mb-3">
              Prêt à organiser votre événement ?
            </h2>
            <p className="text-white/80 mb-6">
              Contactez-nous pour discuter de votre projet et obtenir un devis personnalisé.
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Link to="/contact">
                <button className="bg-white text-primary-600 px-8 py-3 rounded-xl font-semibold hover:bg-white/90 transition-all hover:scale-105 shadow-none">
                  Nous contacter
                </button>
              </Link>
              <Link to="/menu">
                <button className="border-2 border-white text-white px-8 py-3 rounded-xl font-semibold hover:bg-white/10 transition-all hover:scale-105">
                  Voir le menu
                </button>
              </Link>
            </div>
          </FadeIn>
        </div>
      </div>
    </div>
  );
}
