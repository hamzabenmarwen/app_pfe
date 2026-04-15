import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SparklesIcon, PrinterIcon, ClipboardDocumentIcon } from '@heroicons/react/24/outline';
import { orderService, type Order } from '@/services/order.service';
import { eventService } from '@/services/event.service';
import { catalogService, type Expense } from '@/services/catalog.service';
import { LoadingSpinner, Button } from '@/components/ui';
import { useSiteStore } from '@/stores/site.store';

function sanitize(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export default function AdminAIReportPage() {
  const { config } = useSiteStore();
  const [isGenerating, setIsGenerating] = useState(false);
  const [report, setReport] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['ai-report-data'],
    queryFn: async () => {
      const [ordersRes, eventsStatsRes, statsRes, expensesRes, stockRes] = await Promise.all([
        orderService.getAllOrders(1, 500),
        eventService.getEventStats(),
        orderService.getOrderStats(),
        catalogService.getExpenses(),
        catalogService.getAllIngredientsStock(),
      ]);
      return {
        orders: (ordersRes.data || []) as Order[],
        eventStats: eventsStatsRes?.data || {},
        orderStats: statsRes?.data || {},
        expenses: (expensesRes.data || []) as Expense[],
        stock: (stockRes.data || []) as Array<{ name: string; quantity: number; isLowStock: boolean; unit: string }>,
      };
    },
    staleTime: 60 * 1000,
  });

  const generateReport = async () => {
    if (!data) return;
    setIsGenerating(true);

    // Simulate AI processing
    await new Promise((r) => setTimeout(r, 2000));

    const now = new Date();
    const thisMonthOrders = data.orders.filter((o) => {
      const d = new Date(o.createdAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const deliveredOrders = data.orders.filter((o) => o.status === 'DELIVERED');
    const cancelledOrders = data.orders.filter((o) => o.status === 'CANCELLED');
    const pendingOrders = data.orders.filter((o) => o.status === 'PENDING');
    const totalRevenue = deliveredOrders.reduce((s, o) => s + o.totalAmount, 0);
    const monthRevenue = thisMonthOrders.filter((o) => o.status === 'DELIVERED').reduce((s, o) => s + o.totalAmount, 0);
    const paidExpenses = data.expenses.filter((e) => e.status === 'PAID').reduce((s, e) => s + e.amount, 0);
    const lowStockItems = data.stock.filter((s) => s.isLowStock);
    const avgOrderValue = deliveredOrders.length > 0 ? totalRevenue / deliveredOrders.length : 0;
    const cancellationRate = data.orders.length > 0 ? (cancelledOrders.length / data.orders.length) * 100 : 0;

    // Generate executive summary
    const lines: string[] = [
      `📊 RAPPORT EXÉCUTIF — ${config.siteName}`,
      `Généré le ${now.toLocaleDateString('fr-FR')} à ${now.toLocaleTimeString('fr-FR')}`,
      ``,
      `═══════════════════════════════════════════`,
      `📈 PERFORMANCE COMMERCIALE`,
      `═══════════════════════════════════════════`,
      ``,
      `Commandes totales : ${data.orders.length}`,
      `  • Livrées : ${deliveredOrders.length}`,
      `  • En attente : ${pendingOrders.length}`,
      `  • Annulées : ${cancelledOrders.length}`,
      `  • Ce mois : ${thisMonthOrders.length}`,
      ``,
      `Chiffre d'affaires total : ${totalRevenue.toFixed(2)} DT`,
      `CA ce mois : ${monthRevenue.toFixed(2)} DT`,
      `Panier moyen : ${avgOrderValue.toFixed(2)} DT`,
      `Taux d'annulation : ${cancellationRate.toFixed(1)}%`,
      ``,
    ];

    // Status analysis
    if (cancellationRate > 15) {
      lines.push(`⚠️ ALERTE : Taux d'annulation élevé (${cancellationRate.toFixed(1)}%). Investiguer les causes.`);
      lines.push(``);
    }

    if (pendingOrders.length > 5) {
      lines.push(`⚠️ ATTENTION : ${pendingOrders.length} commandes en attente. Prioriser le traitement.`);
      lines.push(``);
    }

    // Expenses
    lines.push(`═══════════════════════════════════════════`);
    lines.push(`💰 SITUATION FINANCIÈRE`);
    lines.push(`═══════════════════════════════════════════`);
    lines.push(``);
    lines.push(`Dépenses totales : ${data.expenses.reduce((s, e) => s + e.amount, 0).toFixed(2)} DT`);
    lines.push(`  • Payées : ${paidExpenses.toFixed(2)} DT`);
    lines.push(`  • En attente : ${data.expenses.filter((e) => e.status !== 'PAID' && e.status !== 'REJECTED').length} dépense(s)`);
    lines.push(``);
    const margin = totalRevenue - paidExpenses;
    lines.push(`Marge nette estimée : ${margin.toFixed(2)} DT ${margin >= 0 ? '✅' : '🔴'}`);
    if (totalRevenue > 0) {
      lines.push(`Taux de marge : ${((margin / totalRevenue) * 100).toFixed(1)}%`);
    }
    lines.push(``);

    // Stock
    lines.push(`═══════════════════════════════════════════`);
    lines.push(`📦 SITUATION DES STOCKS`);
    lines.push(`═══════════════════════════════════════════`);
    lines.push(``);
    lines.push(`Ingrédients en stock : ${data.stock.length}`);
    lines.push(`Alertes stock faible : ${lowStockItems.length}`);
    if (lowStockItems.length > 0) {
      lines.push(``);
      lines.push(`Ingrédients en alerte :`);
      lowStockItems.forEach((item) => {
        lines.push(`  🔴 ${item.name} — ${item.quantity} ${item.unit} restant(s)`);
      });
    }
    lines.push(``);

    // Events
    lines.push(`═══════════════════════════════════════════`);
    lines.push(`🎉 ÉVÉNEMENTS`);
    lines.push(`═══════════════════════════════════════════`);
    lines.push(``);
    lines.push(`Total événements : ${data.eventStats.totalEvents || 0}`);
    lines.push(`Devis en attente : ${data.eventStats.pendingQuotes || 0}`);
    if (data.eventStats.quoteConversionRate) {
      lines.push(`Taux de conversion devis : ${Number(data.eventStats.quoteConversionRate).toFixed(1)}%`);
    }
    lines.push(``);

    // Recommendations
    lines.push(`═══════════════════════════════════════════`);
    lines.push(`💡 RECOMMANDATIONS`);
    lines.push(`═══════════════════════════════════════════`);
    lines.push(``);

    if (lowStockItems.length > 0) {
      lines.push(`1. Réapprovisionner ${lowStockItems.length} ingrédient(s) en stock faible.`);
    }
    if (pendingOrders.length > 0) {
      lines.push(`${lowStockItems.length > 0 ? '2' : '1'}. Traiter les ${pendingOrders.length} commande(s) en attente.`);
    }
    if (cancellationRate > 10) {
      lines.push(`• Analyser les causes d'annulation pour réduire le taux à < 10%.`);
    }
    if (margin < 0) {
      lines.push(`• ⚠️ La marge est négative. Revoir la stratégie de prix ou réduire les dépenses.`);
    }
    if (avgOrderValue < 50) {
      lines.push(`• Promouvoir les formules et menus complets pour augmenter le panier moyen.`);
    }
    lines.push(``);
    lines.push(`— Fin du rapport —`);

    setReport(lines.join('\n'));
    setIsGenerating(false);
  };

  const handlePrint = () => {
    if (!report) return;
    const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
      <title>Rapport IA — ${sanitize(config.siteName)}</title>
      <style>
        body { font-family: 'Courier New', monospace; padding: 30px; max-width: 800px; margin: 0 auto; font-size: 13px; line-height: 1.6; color: #333; white-space: pre-wrap; }
        @media print { body { padding: 15px; } }
      </style>
    </head><body>${sanitize(report)}</body></html>`;
    const w = window.open('', '_blank', 'width=850,height=700');
    if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 300); }
  };

  const handleCopy = () => {
    if (!report) return;
    navigator.clipboard.writeText(report).then(() => {
      import('react-hot-toast').then((mod) => mod.default.success('Rapport copié !'));
    });
  };

  if (isLoading) {
    return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium text-gray-900">Rapport IA</h1>
          <p className="mt-1 text-sm text-gray-500">
            Génération intelligente de rapports exécutifs à partir de vos données
          </p>
        </div>
      </div>

      {/* Generate Section */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center">
        {isGenerating ? (
          <div className="space-y-4 py-6">
            <div className="mx-auto h-14 w-14 animate-spin rounded-full border-4 border-primary-200 border-t-primary-500" />
            <p className="text-sm font-medium text-primary-600">Analyse en cours...</p>
            <p className="text-xs text-gray-400">L'IA analyse vos commandes, dépenses et stocks</p>
          </div>
        ) : !report ? (
          <div className="py-8 space-y-4">
            <SparklesIcon className="mx-auto h-12 w-12 text-primary-400" />
            <h2 className="text-lg font-semibold text-gray-900">Prêt à générer votre rapport</h2>
            <p className="text-sm text-gray-500 max-w-lg mx-auto">
              L'IA va analyser vos commandes, dépenses, stocks et événements pour
              produire un rapport exécutif avec des recommandations personnalisées.
            </p>
            <Button onClick={generateReport} className="mt-2">
              <SparklesIcon className="h-4 w-4 mr-2" />
              Générer le rapport
            </Button>
          </div>
        ) : (
          <div className="text-left space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">Rapport généré</h2>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={handleCopy}>
                  <ClipboardDocumentIcon className="h-4 w-4 mr-1" />
                  Copier
                </Button>
                <Button size="sm" variant="outline" onClick={handlePrint}>
                  <PrinterIcon className="h-4 w-4 mr-1" />
                  Imprimer
                </Button>
                <Button size="sm" onClick={generateReport}>
                  <SparklesIcon className="h-4 w-4 mr-1" />
                  Regénérer
                </Button>
              </div>
            </div>
            <pre className="bg-gray-50 rounded-xl p-5 text-sm text-gray-800 overflow-auto max-h-[70vh] whitespace-pre-wrap font-mono leading-relaxed border border-gray-200">
              {report}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
