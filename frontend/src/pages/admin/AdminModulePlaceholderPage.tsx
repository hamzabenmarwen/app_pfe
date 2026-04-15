import { Link } from 'react-router-dom';
import { ArrowLongRightIcon, ClockIcon } from '@heroicons/react/24/outline';

interface AdminModulePlaceholderPageProps {
  title: string;
  description: string;
  nextSteps?: string[];
}

export default function AdminModulePlaceholderPage({
  title,
  description,
  nextSteps = [],
}: AdminModulePlaceholderPageProps) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
          <ClockIcon className="h-6 w-6" />
        </div>

        <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
        <p className="mt-2 max-w-3xl text-sm text-gray-600">{description}</p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/admin"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            Retour au dashboard
          </Link>
          <Link
            to="/admin/health"
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-700"
          >
            Vérifier la santé des services
            <ArrowLongRightIcon className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Prochaine étape</h2>
        {nextSteps.length === 0 ? (
          <p className="mt-2 text-sm text-gray-600">
            Ce module est prêt côté navigation. On peut maintenant brancher les endpoints et la logique métier.
          </p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm text-gray-600">
            {nextSteps.map((step) => (
              <li key={step} className="rounded-lg bg-gray-50 px-3 py-2">
                {step}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
