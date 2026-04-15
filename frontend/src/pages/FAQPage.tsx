import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const faqData: FAQItem[] = [
  // Commandes
  {
    category: 'Commandes',
    question: 'Comment passer une commande ?',
    answer: 'Vous pouvez passer commande directement sur notre site en parcourant notre menu, en ajoutant les plats à votre panier et en procédant au paiement. Vous pouvez également nous contacter par téléphone ou email pour des commandes personnalisées.',
  },
  {
    category: 'Commandes',
    question: 'Quel est le délai minimum pour commander ?',
    answer: 'Nous demandons un délai minimum de 48 heures pour les commandes standards. Pour les événements importants ou les grandes quantités, nous recommandons de nous contacter au moins 2 semaines à l\'avance.',
  },
  {
    category: 'Commandes',
    question: 'Puis-je modifier ma commande après validation ?',
    answer: 'Oui, vous pouvez modifier votre commande jusqu\'à 48 heures avant la livraison. Contactez-nous par email ou téléphone pour effectuer les modifications. Des frais supplémentaires peuvent s\'appliquer selon les changements.',
  },
  {
    category: 'Commandes',
    question: 'Y a-t-il un minimum de commande ?',
    answer: 'Pour les livraisons, nous demandons un minimum de commande de 50 DT. Ce minimum peut varier selon la zone de livraison. Pour les événements, contactez-nous pour un devis personnalisé.',
  },
  
  // Livraison
  {
    category: 'Livraison',
    question: 'Quelles sont vos zones de livraison ?',
    answer: 'Nous livrons dans Sfax et ses environs. Pour les zones plus éloignées, contactez-nous pour étudier la faisabilité et les frais de livraison associés.',
  },
  {
    category: 'Livraison',
    question: 'Combien coûte la livraison ?',
    answer: 'Les frais de livraison sont calculés en fonction de la distance et du volume de la commande. Le montant est affiché lors du passage de commande. La livraison est offerte à partir de 200 DT d\'achat dans Sfax.',
  },
  {
    category: 'Livraison',
    question: 'Comment sont conservés les plats pendant la livraison ?',
    answer: 'Nos plats sont livrés dans des contenants isothermes adaptés. Les plats chauds sont maintenus à température et les plats froids sont conservés au frais. Nous vous recommandons de consommer les plats dans les 2 heures suivant la livraison.',
  },
  
  // Paiement
  {
    category: 'Paiement',
    question: 'Quels moyens de paiement acceptez-vous ?',
    answer: 'Nous acceptons les espèces à la livraison et les virements bancaires. Pour les entreprises, nous proposons également le paiement par facture avec un délai de 30 jours.',
  },
  {
    category: 'Paiement',
    question: 'Dois-je verser un acompte ?',
    answer: 'Pour les commandes supérieures à 500 DT et pour tous les événements, nous demandons un acompte de 30% à la commande. Le solde est dû à la livraison ou selon les modalités convenues.',
  },
  
  // Allergènes et régimes
  {
    category: 'Allergènes et régimes',
    question: 'Proposez-vous des options végétariennes/véganes ?',
    answer: 'Oui, nous proposons une large gamme de plats végétariens et véganes. Vous pouvez filtrer notre menu par régime alimentaire pour trouver les options qui vous conviennent.',
  },
  {
    category: 'Allergènes et régimes',
    question: 'Comment puis-je connaître les allergènes présents dans vos plats ?',
    answer: 'La liste des allergènes est indiquée sur chaque fiche produit. Si vous avez des allergies spécifiques, n\'hésitez pas à nous contacter pour vérifier la composition exacte des plats.',
  },
  {
    category: 'Allergènes et régimes',
    question: 'Pouvez-vous adapter les recettes pour des régimes spéciaux ?',
    answer: 'Oui, nous pouvons adapter la plupart de nos recettes pour tenir compte de vos contraintes alimentaires (sans gluten, sans lactose, halal, casher, etc.). Contactez-nous pour en discuter.',
  },
  
  // Événements
  {
    category: 'Événements',
    question: 'Organisez-vous des événements sur mesure ?',
    answer: 'Absolument ! Nous créons des menus personnalisés pour tous types d\'événements : mariages, réceptions d\'entreprise, anniversaires, cocktails, etc. Demandez un devis gratuit via notre formulaire de contact.',
  },
  {
    category: 'Événements',
    question: 'Proposez-vous du personnel de service ?',
    answer: 'Oui, nous proposons des formules avec personnel de service (serveurs, chef sur place, maître d\'hôtel). Cette option est idéale pour les événements où vous souhaitez vous libérer de toute logistique.',
  },
  {
    category: 'Événements',
    question: 'Fournissez-vous la vaisselle et le matériel ?',
    answer: 'Nous proposons des options de location de vaisselle, verrerie et matériel de réception. Cela inclut aussi les nappes, décorations de table et équipements de service. Tout est détaillé dans votre devis.',
  },
  
  // Annulation
  {
    category: 'Annulation',
    question: 'Quelle est votre politique d\'annulation ?',
    answer: 'Annulation plus de 72h avant : remboursement intégral. Entre 48h et 72h : remboursement de 50%. Moins de 48h : aucun remboursement. Pour les événements, des conditions spécifiques s\'appliquent.',
  },
  {
    category: 'Annulation',
    question: 'Que se passe-t-il en cas de problème avec ma commande ?',
    answer: 'Votre satisfaction est notre priorité. En cas de problème (retard, plat manquant, qualité), contactez-nous immédiatement. Nous ferons tout notre possible pour résoudre la situation et vous dédommager si nécessaire.',
  },
];

function FAQAccordion({ item, isOpen, onToggle }: { item: FAQItem; isOpen: boolean; onToggle: () => void }) {
  return (
    <div className="border-b border-gray-100">
      <button
        onClick={onToggle}
        className="w-full py-5 flex justify-between items-center text-left hover:bg-transparent/50 transition-all px-3 rounded-xl"
      >
        <span className="font-medium text-gray-900 pr-4">{item.question}</span>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3 }}
        >
          <ChevronDownIcon className="h-5 w-5 text-primary-500 flex-shrink-0" />
        </motion.span>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="pr-8 pl-3 pb-5">
              <p className="text-gray-500 leading-relaxed">{item.answer}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const categories = ['all', ...Array.from(new Set(faqData.map((item) => item.category)))];
  
  const filteredFAQ = activeCategory === 'all' 
    ? faqData 
    : faqData.filter((item) => item.category === activeCategory);

  return (
    <div className="min-h-screen bg-transparent">
      {/* Hero Header */}
      <div className="relative bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 text-white py-20 overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
          backgroundSize: '32px 32px',
        }} />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl text-center relative">
          <motion.span
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring' }}
            className="text-5xl block mb-4"
          >❓</motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="font-display text-4xl font-bold mb-4"
          >Questions Fréquentes</motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-gray-700 text-lg max-w-xl mx-auto"
          >
            Trouvez rapidement les réponses à vos questions.
          </motion.p>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl -mt-8 pb-16 relative z-10">

        {/* Category Filter */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-wrap gap-2 justify-center mb-8"
        >
          {categories.map((category) => (
            <motion.button
              key={category}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveCategory(category)}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
                activeCategory === category
                  ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/25'
                  : 'bg-white text-gray-500 border border-gray-200 hover:border-primary-300 hover:text-primary-400'
              }`}
            >
              {category === 'all' ? 'Toutes les questions' : category}
            </motion.button>
          ))}
        </motion.div>

        {/* FAQ List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-6 md:p-8"
        >
          {filteredFAQ.map((item, index) => (
            <FAQAccordion
              key={index}
              item={item}
              isOpen={openIndex === index}
              onToggle={() => setOpenIndex(openIndex === index ? null : index)}
            />
          ))}
        </motion.div>

        {/* Contact CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-10 text-center bg-gradient-to-br from-primary-600 to-primary-800 rounded-2xl p-8 text-white"
        >
          <h2 className="text-2xl font-bold mb-3">
            Vous n'avez pas trouvé votre réponse ?
          </h2>
          <p className="text-white/80 mb-6">
            Notre équipe est là pour vous aider.
          </p>
          <a
            href="/contact"
            className="inline-block bg-white text-primary-600 px-8 py-3 rounded-xl font-semibold hover:bg-white/90 transition-all shadow-lg"
          >
            Nous contacter
          </a>
        </motion.div>
      </div>
    </div>
  );
}
