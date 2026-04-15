import { useSiteStore } from '@/stores/site.store';

export default function TermsPage() {
  const { config } = useSiteStore();

  return (
    <div className="min-h-screen bg-transparent">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-primary-600 via-primary-500 to-primary-400 text-white py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl text-center">
          <span className="text-5xl block mb-4">📄</span>
          <h1 className="text-4xl font-bold">Conditions Générales de Vente</h1>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl -mt-8 pb-16 relative z-10">
        <div className="glass-card p-8 md:p-12 prose prose-gray max-w-none">
          <p className="text-sm text-gray-400 mb-6">Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}</p>

          <section className="mb-8">
            <h2 className="text-xl font-medium text-gray-900 mb-4">1. Objet</h2>
            <p className="text-gray-500 leading-relaxed">
              Les présentes conditions générales de vente (CGV) régissent les relations contractuelles 
              entre le traiteur utilisateur de la plateforme {config.siteName} et ses clients pour toute commande de prestations traiteur passée 
              sur le site ou par tout autre moyen.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-medium text-gray-900 mb-4">2. Commandes</h2>
            <p className="text-gray-500 leading-relaxed mb-4">
              Toute commande implique l'acceptation sans réserve des présentes CGV. Les commandes 
              doivent être passées au minimum 48 heures avant la date de livraison souhaitée. 
              Pour les événements importants, un délai de 2 semaines est recommandé.
            </p>
            <p className="text-gray-500 leading-relaxed">
              La commande est considérée comme ferme et définitive après réception du paiement 
              ou de l'acompte requis et confirmation par email de notre part.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-medium text-gray-900 mb-4">3. Tarifs et Paiement</h2>
            <p className="text-gray-500 leading-relaxed mb-4">
              Les prix sont indiqués en Dinars Tunisiens (DT) TTC. Ils comprennent la préparation des plats et 
              leur conditionnement. Les frais de livraison sont calculés séparément en fonction 
              de la distance et du volume de la commande.
            </p>
            <p className="text-gray-500 leading-relaxed">
              Le paiement s'effectue en espèces à la livraison. 
              Un acompte de 30% peut être demandé pour les commandes supérieures à 500 DT.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-medium text-gray-900 mb-4">4. Livraison</h2>
            <p className="text-gray-500 leading-relaxed mb-4">
              Les livraisons sont effectuées à l'adresse indiquée lors de la commande. 
              Le client s'engage à être présent ou à désigner une personne pour réceptionner 
              la commande. Tout retard dû à une absence du client ne pourra être imputé à {config.siteName}.
            </p>
            <p className="text-gray-500 leading-relaxed">
              Les créneaux de livraison sont indicatifs et peuvent varier de 30 minutes. 
              En cas de retard significatif de notre fait, le client en sera informé dans les plus brefs délais.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-medium text-gray-900 mb-4">5. Annulation et Modification</h2>
            <ul className="list-disc pl-6 text-gray-500 space-y-2">
              <li>Annulation plus de 72h avant : remboursement intégral</li>
              <li>Annulation entre 48h et 72h avant : remboursement de 50%</li>
              <li>Annulation moins de 48h avant : aucun remboursement</li>
            </ul>
            <p className="text-gray-500 leading-relaxed mt-4">
              Toute modification de commande doit être signalée au moins 48h avant la livraison 
              et reste soumise à notre accord.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-medium text-gray-900 mb-4">6. Allergènes</h2>
            <p className="text-gray-500 leading-relaxed">
              Les informations relatives aux allergènes sont disponibles sur notre site et 
              sur demande. Il appartient au client de nous signaler toute allergie ou 
              intolérance alimentaire lors de la commande. {config.siteName} décline toute 
              responsabilité en cas de non-déclaration d'allergies.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-medium text-gray-900 mb-4">7. Responsabilité</h2>
            <p className="text-gray-500 leading-relaxed">
              {config.siteName} s'engage à fournir des produits de qualité, préparés dans le respect 
              des normes d'hygiène en vigueur. Notre responsabilité ne saurait être engagée 
              pour les dommages résultant d'une mauvaise conservation des produits après livraison.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-medium text-gray-900 mb-4">8. Propriété Intellectuelle</h2>
            <p className="text-gray-500 leading-relaxed">
              L'ensemble des éléments du site (textes, images, logos) sont la propriété 
              exclusive de {config.siteName} et sont protégés par les lois relatives à la 
              propriété intellectuelle.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-medium text-gray-900 mb-4">9. Litiges</h2>
            <p className="text-gray-500 leading-relaxed">
              Les présentes CGV sont soumises au droit tunisien. En cas de litige, les parties 
              s'engagent à rechercher une solution amiable avant toute action judiciaire. 
              À défaut, les tribunaux de Sfax seront seuls compétents.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium text-gray-900 mb-4">10. Contact</h2>
            <p className="text-gray-500 leading-relaxed">
              Pour toute question relative aux présentes CGV, veuillez nous contacter à : 
              <br />
              Email : {config.siteEmail}<br />
              Téléphone : +216 XX XXX XXX
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}