import { useSiteStore } from '@/stores/site.store';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/stores/auth.store';

export default function PrivacyPage() {
  const { config } = useSiteStore();
  const { isAuthenticated, logout } = useAuthStore();
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const response = await authService.exportMyData();
      const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'mes-donnees-rgpd.json';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Export RGPD téléchargé');
    } catch {
      toast.error('Échec de l’export RGPD');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm('Confirmer la suppression (anonymisation) définitive de votre compte ?');
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      await authService.deleteMyAccount();
      logout();
      toast.success('Compte anonymisé avec succès');
    } catch {
      toast.error('Échec de la suppression du compte');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-primary-600 via-primary-500 to-primary-400 text-white py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl text-center">
          <span className="text-5xl block mb-4">🔒</span>
          <h1 className="text-4xl font-bold">Politique de Confidentialité</h1>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl -mt-8 pb-16 relative z-10">
        <div className="glass-card p-8 md:p-12 prose prose-gray max-w-none">
          <p className="text-sm text-gray-400 mb-6">Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}</p>

          <section className="mb-8">
            <h2 className="text-xl font-medium text-gray-900 mb-4">1. Introduction</h2>
            <p className="text-gray-500 leading-relaxed">
              {config.siteName} s'engage à protéger la vie privée de ses utilisateurs. Cette politique 
              de confidentialité explique comment nous collectons, utilisons, partageons et 
              protégeons vos données personnelles conformément au Règlement Général sur la 
              Protection des Données (RGPD).
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-medium text-gray-900 mb-4">2. Données Collectées</h2>
            <p className="text-gray-500 leading-relaxed mb-4">Nous collectons les données suivantes :</p>
            <ul className="list-disc pl-6 text-gray-500 space-y-2">
              <li><strong>Données d'identification :</strong> nom, prénom, adresse email, numéro de téléphone</li>
              <li><strong>Données de livraison :</strong> adresse postale</li>
              <li><strong>Données de commande :</strong> historique des commandes, préférences alimentaires</li>
              <li><strong>Données de paiement :</strong> mode de paiement choisi</li>
              <li><strong>Données techniques :</strong> adresse IP, cookies, données de navigation</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-medium text-gray-900 mb-4">3. Utilisation des Données</h2>
            <p className="text-gray-500 leading-relaxed mb-4">Vos données sont utilisées pour :</p>
            <ul className="list-disc pl-6 text-gray-500 space-y-2">
              <li>Traiter et livrer vos commandes</li>
              <li>Gérer votre compte client</li>
              <li>Vous contacter concernant vos commandes</li>
              <li>Améliorer nos services</li>
              <li>Vous envoyer des communications marketing (avec votre consentement)</li>
              <li>Respecter nos obligations légales</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-medium text-gray-900 mb-4">4. Base Légale</h2>
            <p className="text-gray-500 leading-relaxed">
              Le traitement de vos données repose sur :<br /><br />
              • L'exécution du contrat (traitement de vos commandes)<br />
              • Votre consentement (marketing, cookies non essentiels)<br />
              • Notre intérêt légitime (amélioration des services, sécurité)<br />
              • Nos obligations légales (comptabilité, fiscalité)
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-medium text-gray-900 mb-4">5. Partage des Données</h2>
            <p className="text-gray-500 leading-relaxed mb-4">
              Vos données peuvent être partagées avec :
            </p>
            <ul className="list-disc pl-6 text-gray-500 space-y-2">
              <li>Nos prestataires de livraison</li>
              <li>Nos prestataires techniques (hébergement, email)</li>
              <li>Les autorités compétentes si requis par la loi</li>
            </ul>
            <p className="text-gray-500 leading-relaxed mt-4">
              Nous ne vendons jamais vos données personnelles à des tiers.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-medium text-gray-900 mb-4">6. Conservation des Données</h2>
            <p className="text-gray-500 leading-relaxed">
              Vos données sont conservées pendant la durée de votre relation client, puis 
              archivées conformément aux obligations légales (5 ans pour les données comptables). 
              Les données de votre compte sont supprimées 3 ans après votre dernière activité.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-medium text-gray-900 mb-4">7. Vos Droits</h2>
            <p className="text-gray-500 leading-relaxed mb-4">
              Conformément au RGPD, vous disposez des droits suivants :
            </p>
            <ul className="list-disc pl-6 text-gray-500 space-y-2">
              <li><strong>Droit d'accès :</strong> obtenir une copie de vos données</li>
              <li><strong>Droit de rectification :</strong> corriger vos données inexactes</li>
              <li><strong>Droit à l'effacement :</strong> demander la suppression de vos données</li>
              <li><strong>Droit à la portabilité :</strong> recevoir vos données dans un format structuré</li>
              <li><strong>Droit d'opposition :</strong> vous opposer au traitement de vos données</li>
              <li><strong>Droit à la limitation :</strong> limiter le traitement de vos données</li>
            </ul>
            <p className="text-gray-500 leading-relaxed mt-4">
              Pour exercer vos droits, contactez-nous à : {config.siteEmail}
            </p>

            {isAuthenticated && (
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleExportData}
                  disabled={isExporting}
                  className="rounded-xl bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-60"
                >
                  {isExporting ? 'Export en cours...' : 'Télécharger mes données (RGPD)'}
                </button>
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  disabled={isDeleting}
                  className="rounded-xl border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
                >
                  {isDeleting ? 'Suppression...' : 'Supprimer mon compte'}
                </button>
              </div>
            )}
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-medium text-gray-900 mb-4">8. Cookies</h2>
            <p className="text-gray-500 leading-relaxed mb-4">
              Nous utilisons des cookies pour :
            </p>
            <ul className="list-disc pl-6 text-gray-500 space-y-2">
              <li>Assurer le bon fonctionnement du site (cookies essentiels)</li>
              <li>Mémoriser vos préférences (cookies fonctionnels)</li>
              <li>Analyser l'utilisation du site (cookies analytiques)</li>
            </ul>
            <p className="text-gray-500 leading-relaxed mt-4">
              Vous pouvez gérer vos préférences de cookies dans les paramètres de votre navigateur.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-medium text-gray-900 mb-4">9. Sécurité</h2>
            <p className="text-gray-500 leading-relaxed">
              Nous mettons en œuvre des mesures de sécurité techniques et organisationnelles 
              appropriées pour protéger vos données contre tout accès non autorisé, modification, 
              divulgation ou destruction.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium text-gray-900 mb-4">10. Contact</h2>
            <p className="text-gray-500 leading-relaxed">
              Pour toute question relative à cette politique ou à vos données personnelles :<br /><br />
              <strong>Délégué à la Protection des Données</strong><br />
              Email : {config.siteEmail}<br />
              Adresse : Tunisie<br /><br />
              Vous avez également le droit d'introduire une réclamation auprès de l'INPDP 
              (Instance Nationale de Protection des Données Personnelles).
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
