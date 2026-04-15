import { useEffect, useMemo, useState } from 'react';
import { ArrowPathIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { Badge, Button } from '@/components/ui';
import { catalogService, type AuditLog } from '@/services/catalog.service';

type DisplayLog = {
  id: string;
  timestamp: string;
  module: string;
  action: string;
  entityType: string;
  entityId: string;
  message: string;
};

const moduleOptions = ['all', 'purchase-orders', 'expenses', 'stock', 'finance', 'documents'];

function statusVariant(action: string): 'default' | 'info' | 'success' | 'warning' | 'error' {
  if (action.includes('delete') || action.includes('cancel') || action.includes('reject')) return 'error';
  if (action.includes('create') || action.includes('receive')) return 'success';
  if (action.includes('update') || action.includes('status')) return 'info';
  if (action.includes('refund')) return 'warning';
  return 'default';
}

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<DisplayLog[]>([]);
  const [moduleFilter, setModuleFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const refresh = async () => {
    try {
      setIsLoading(true);
      const response = await catalogService.getAuditLogs({
        module: moduleFilter === 'all' ? undefined : moduleFilter,
        search: search.trim() || undefined,
        limit: 500,
      });

      const rows = ((response.data || []) as AuditLog[]).map((log) => ({
        id: log.id,
        timestamp: log.createdAt,
        module: log.module,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        message: log.message,
      }));

      setLogs(rows);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, [moduleFilter]);

  const filtered = useMemo(() => {
    return logs.filter((log) => {
      const q = search.trim().toLowerCase();
      const bySearch =
        q.length === 0 ||
        log.message.toLowerCase().includes(q) ||
        log.entityType.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q) ||
        log.entityId.toLowerCase().includes(q);
      return bySearch;
    });
  }, [logs, search]);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(filtered, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium text-gray-900">Audit logs</h1>
          <p className="mt-1 text-sm text-gray-500">Traçabilite des actions critiques stock, achats et finance.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => void refresh()} isLoading={isLoading}>
            <ArrowPathIcon className="h-5 w-5" />
          </Button>
          <Button variant="outline" onClick={exportJson}>
            <ArrowDownTrayIcon className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher action, message, entite"
            className="flex-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none"
          />
          <Button variant="outline" onClick={() => void refresh()} isLoading={isLoading}>Appliquer</Button>
          <select
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none"
          >
            {moduleOptions.map((module) => (
              <option key={module} value={module}>{module === 'all' ? 'Tous modules' : module}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Module</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Action</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Entite</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">Aucun log</td>
                </tr>
              ) : (
                filtered.map((log) => (
                  <tr key={log.id}>
                    <td className="px-4 py-3 text-sm text-gray-600">{new Date(log.timestamp).toLocaleString('fr-FR')}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{log.module}</td>
                    <td className="px-4 py-3">
                      <Badge variant={statusVariant(log.action)}>{log.action}</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{log.entityType} - {log.entityId.slice(0, 8)}</td>
                    <td className="px-4 py-3 text-sm text-gray-800">{log.message}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
