import { useEffect, useState, useMemo } from 'react';
import { ArrowPathIcon, PrinterIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { orderService, type Order } from '@/services/order.service';
import { Badge, Button, LoadingSpinner } from '@/components/ui';
import { useSiteStore } from '@/stores/site.store';

interface CreditNote {
  id: string;
  orderId: string;
  orderNumber: string;
  amount: number;
  reason: string;
  createdAt: string;
}

const CN_STORAGE_KEY = 'admin_credit_notes_v1';

function loadCreditNotes(): CreditNote[] {
  try {
    const raw = localStorage.getItem(CN_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCreditNote(cn: CreditNote) {
  const current = loadCreditNotes();
  const next = [cn, ...current].slice(0, 200);
  localStorage.setItem(CN_STORAGE_KEY, JSON.stringify(next));
}

function sanitize(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export default function AdminCreditNotesPage() {
  const { config } = useSiteStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reason, setReason] = useState('Annulation de commande');

  const loadData = async () => {
    try {
      setIsLoading(true);
      const res = await orderService.getAllOrders(1, 200);
      setOrders((res.data || []) as Order[]);
      setCreditNotes(loadCreditNotes());
    } catch {
      toast.error('Erreur lors du chargement');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const cancelledOrders = useMemo(
    () => orders.filter((o) => o.status === 'CANCELLED'),
    [orders]
  );

  const existingCNOrderIds = useMemo(
    () => new Set(creditNotes.map((cn) => cn.orderId)),
    [creditNotes]
  );

  const eligibleOrders = useMemo(
    () => cancelledOrders.filter((o) => !existingCNOrderIds.has(o.id)),
    [cancelledOrders, existingCNOrderIds]
  );

  const totalCredited = useMemo(
    () => creditNotes.reduce((sum, cn) => sum + cn.amount, 0),
    [creditNotes]
  );

  const handleCreateCreditNote = (order: Order) => {
    const cn: CreditNote = {
      id: `CN-${Date.now()}`,
      orderId: order.id,
      orderNumber: order.orderNumber || order.id.slice(-6),
      amount: order.totalAmount,
      reason,
      createdAt: new Date().toISOString(),
    };
    saveCreditNote(cn);
    setCreditNotes(loadCreditNotes());
    toast.success(`Avoir ${cn.id.slice(-8)} créé pour ${cn.amount.toFixed(2)} DT`);
  };

  const printCreditNote = (cn: CreditNote) => {
    const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
      <title>Avoir ${sanitize(cn.id)}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', sans-serif; padding: 30px; max-width: 700px; margin: 0 auto; color: #333; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; padding-bottom: 15px; border-bottom: 3px solid #b5854b; }
        .logo { font-size: 24px; font-weight: 700; color: #b5854b; }
        .logo-sub { font-size: 11px; color: #888; margin-top: 4px; }
        .doc-type { font-size: 20px; color: #dc2626; font-weight: 600; text-align: right; }
        .doc-number { font-size: 12px; color: #888; margin-top: 6px; text-align: right; }
        .info { padding: 20px; background: #fef2f2; border-radius: 8px; border-left: 4px solid #dc2626; margin-bottom: 25px; }
        .info h3 { font-size: 13px; color: #dc2626; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px; }
        .info p { font-size: 13px; color: #555; line-height: 1.6; }
        .amount-box { text-align: center; padding: 25px; background: #f8f8f6; border-radius: 12px; border: 2px solid #b5854b; }
        .amount-label { font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 2px; }
        .amount-value { font-size: 36px; font-weight: 700; color: #dc2626; margin-top: 8px; }
        .footer { margin-top: 40px; padding-top: 15px; border-top: 1px solid #eee; text-align: center; font-size: 11px; color: #aaa; }
        @media print { body { padding: 15px; } }
      </style>
    </head><body>
      <div class="header">
        <div>
          <div class="logo">${sanitize(config.siteName)}</div>
          <div class="logo-sub">Plateforme de gestion pour traiteurs</div>
        </div>
        <div>
          <div class="doc-type">AVOIR</div>
          <div class="doc-number">${sanitize(cn.id)} — ${new Date(cn.createdAt).toLocaleDateString('fr-FR')}</div>
        </div>
      </div>
      <div class="info">
        <h3>Détails de l'avoir</h3>
        <p><strong>Commande d'origine :</strong> #${sanitize(cn.orderNumber)}</p>
        <p><strong>Motif :</strong> ${sanitize(cn.reason)}</p>
        <p><strong>Date d'émission :</strong> ${new Date(cn.createdAt).toLocaleString('fr-FR')}</p>
      </div>
      <div class="amount-box">
        <div class="amount-label">Montant de l'avoir</div>
        <div class="amount-value">-${cn.amount.toFixed(2)} DT</div>
      </div>
      <div class="footer">${sanitize(config.siteName)} — Avoir client</div>
    </body></html>`;
    const w = window.open('', '_blank', 'width=750,height=600');
    if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 300); }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium text-gray-900">Avoirs client</h1>
          <p className="mt-1 text-sm text-gray-500">Émission d'avoirs pour remboursement ou correction de factures</p>
        </div>
        <Button variant="outline" onClick={() => void loadData()}>
          <ArrowPathIcon className="h-5 w-5" />
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-gray-400">Avoirs émis</p>
          <p className="mt-2 text-xl font-semibold text-gray-900">{creditNotes.length}</p>
        </div>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
          <p className="text-xs uppercase tracking-wide text-red-700">Total crédité</p>
          <p className="mt-2 text-xl font-semibold text-red-800">{totalCredited.toFixed(2)} DT</p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs uppercase tracking-wide text-amber-700">Commandes éligibles</p>
          <p className="mt-2 text-xl font-semibold text-amber-800">{eligibleOrders.length}</p>
        </div>
      </div>

      {/* Eligible Orders */}
      {eligibleOrders.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
          <h2 className="text-base font-semibold text-gray-900">Commandes annulées sans avoir</h2>
          <div className="mb-3">
            <label className="block text-xs font-medium uppercase tracking-wide text-gray-500 mb-1">Motif de l'avoir</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full max-w-sm rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
            >
              <option value="Annulation de commande">Annulation de commande</option>
              <option value="Erreur de facturation">Erreur de facturation</option>
              <option value="Remboursement partiel">Remboursement partiel</option>
              <option value="Geste commercial">Geste commercial</option>
              <option value="Problème qualité">Problème qualité</option>
            </select>
          </div>
          <div className="space-y-2">
            {eligibleOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-red-50/50 transition-colors">
                <div>
                  <span className="font-medium text-gray-900">#{order.orderNumber || order.id.slice(-6)}</span>
                  <span className="text-sm text-gray-500 ml-3">{new Date(order.createdAt).toLocaleDateString('fr-FR')}</span>
                  <Badge variant="error" className="ml-2">Annulée</Badge>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-gray-900">{order.totalAmount.toFixed(2)} DT</span>
                  <Button size="sm" onClick={() => handleCreateCreditNote(order)}>
                    Émettre l'avoir
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Credit Notes List */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="text-base font-semibold text-gray-900">Historique des avoirs</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">N° Avoir</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Commande</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Motif</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Montant</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Date</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {creditNotes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                    Aucun avoir émis
                  </td>
                </tr>
              ) : (
                creditNotes.map((cn) => (
                  <tr key={cn.id}>
                    <td className="px-4 py-3 text-sm font-semibold text-red-600">{cn.id.slice(-8)}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">#{cn.orderNumber}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{cn.reason}</td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-red-600">-{cn.amount.toFixed(2)} DT</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{new Date(cn.createdAt).toLocaleDateString('fr-FR')}</td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant="outline" onClick={() => printCreditNote(cn)}>
                        <PrinterIcon className="h-4 w-4" />
                      </Button>
                    </td>
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
