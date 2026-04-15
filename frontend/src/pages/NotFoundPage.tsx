import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HomeIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-transparent">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center px-4"
      >
        <motion.span
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          className="text-8xl block mb-6"
        >
          🍽️
        </motion.span>
        <h1 className="font-display text-6xl sm:text-8xl font-medium text-gray-900 mb-4">404</h1>
        <p className="text-xl text-gray-500 mb-2">Page introuvable</p>
        <p className="text-gray-500 mb-10 max-w-md mx-auto">
          La page que vous recherchez n'existe pas ou a été déplacée.
        </p>
        <Link to="/">
          <Button className="!rounded-full px-8">
            <HomeIcon className="h-5 w-5 mr-2" />
            Retour à l'accueil
          </Button>
        </Link>
      </motion.div>
    </div>
  );
}
