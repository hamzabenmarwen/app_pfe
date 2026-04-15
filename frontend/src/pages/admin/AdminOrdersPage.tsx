import { useState, useEffect } from 'react';
import { BanknotesIcon, PrinterIcon, ArrowDownTrayIcon, MagnifyingGlassIcon, ChevronUpIcon, ChevronDownIcon, CubeIcon } from '@heroicons/react/24/outline';
import { orderService, type Order } from '@/services/order.service';
import { paymentService } from '@/services/payment.service';
import { LoadingSpinner, Badge } from '@/components/ui';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { useSiteStore } from '@/stores/site.store';



const ORDER_STATUSES = [
  { value: 'PENDING', label: 'En attente', color: 'warning' },
  { value: 'CONFIRMED', label: 'Confirmee', color: 'info' },
  { value: 'PREPARING', label: 'En preparation', color: 'info' },
  { value: 'READY', label: 'Prete', color: 'success' },
  { value: 'DELIVERING', label: 'En livraison', color: 'info' },
  { value: 'DELIVERED', label: 'Livree', color: 'success' },
  { value: 'CANCELLED', label: 'Annulee', color: 'error' },
] as const;

const STATUS_FLOW = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERING', 'DELIVERED'];

function sanitize(str: string | undefined | null): string {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildOrderPrintHTML(order: Order, siteName: string): string {
  const statusLabel = ORDER_STATUSES.find((s) => s.value === order.status)?.label || order.status;
  const paymentStatus = order.invoice?.payment?.status === 'COMPLETED' ? 'Paye' : 'En attente';
  const paymentMethod = order.invoice?.payment?.method === 'FLOUCI' ? 'Flouci' : 'Especes';
  const address = order.deliveryAddress;
  const addressStr = address ? `${sanitize(address.street)}, ${sanitize(address.city)} ${sanitize(address.zipCode)}` : '-';

  return `<!DOCTYPE html><html lang="fr"><head>
    <meta charset="UTF-8">
    <title>Bon de commande #${sanitize(order.id.slice(-6))}</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Segoe UI', Tahoma, Geneva, sans-serif; padding: 30px; max-width: 800px; margin: 0 auto; color: #333; }
      .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; padding-bottom: 15px; border-bottom: 3px solid #b5854b; }
      .logo { font-size: 26px; font-weight: 700; color: #b5854b; }
      .logo-sub { font-size: 11px; color: #888; margin-top: 4px; }
      .doc-type { font-size: 22px; color: #333; font-weight: 600; text-align: right; }
      .doc-number { font-size: 12px; color: #888; margin-top: 6px; text-align: right; }
      .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 25px; }
      .meta-block { padding: 15px; background: #fafaf8; border-radius: 8px; border: 1px solid #eee; }
      .meta-block h3 { font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #b5854b; margin-bottom: 8px; font-weight: 600; }
      .meta-block p { font-size: 13px; color: #555; line-height: 1.6; }
      .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
      .items-table th { text-align: left; padding: 10px 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #888; border-bottom: 2px solid #b5854b; font-weight: 600; }
      .items-table td { padding: 10px 12px; font-size: 13px; border-bottom: 1px solid #f0f0f0; }
      .total-section { margin-top: 15px; text-align: right; }
      .total-row { display: flex; justify-content: flex-end; gap: 30px; padding: 4px 0; font-size: 13px; color: #666; }
      .total-row.grand { border-top: 2px solid #333; padding-top: 10px; margin-top: 8px; font-size: 16px; font-weight: 700; color: #333; }
      .notes { margin-top: 20px; padding: 15px; background: #fff8f0; border-radius: 8px; border-left: 4px solid #b5854b; }
      .notes h4 { font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #b5854b; margin-bottom: 6px; }
      .notes p { font-size: 13px; color: #666; }
      .footer { margin-top: 40px; padding-top: 15px; border-top: 1px solid #eee; text-align: center; font-size: 11px; color: #aaa; }
      @media print { body { padding: 15px; } .no-print { display: none; } }
    </style>
  </head><body>
    <div class="header">
      <div>
        <div class="logo">${sanitize(siteName)}</div>
        <div class="logo-sub">Plateforme de gestion pour traiteurs</div>
      </div>
      <div>
        <div class="doc-type">BON DE COMMANDE</div>
        <div class="doc-number">#${sanitize(order.id.slice(-6))} - ${new Date(order.createdAt).toLocaleDateString('fr-FR')}</div>
      </div>
    </div>
    <div class="meta-grid">
      <div class="meta-block">
        <h3>Informations</h3>
        <p><strong>Date commande :</strong> ${new Date(order.createdAt).toLocaleString('fr-FR')}</p>
        <p><strong>Livraison :</strong> ${order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString('fr-FR') : '-'}</p>
        <p><strong>Statut :</strong> ${sanitize(statusLabel)}</p>
      </div>
      <div class="meta-block">
        <h3>Paiement & Adresse</h3>
        <p><strong>Methode :</strong> ${sanitize(paymentMethod)}</p>
        <p><strong>Paiement :</strong> ${sanitize(paymentStatus)}</p>
        <p><strong>Adresse :</strong> ${addressStr}</p>
      </div>
    </div>
    <table class="items-table">
      <thead><tr><th>Plat</th><th style="text-align:center">Qte</th><th style="text-align:right">Prix unit.</th><th style="text-align:right">Total</th></tr></thead>
      <tbody>
        ${(order.items || []).map((item: any) => `
          <tr>
            <td>${sanitize(item.platName)}</td>
            <td style="text-align:center">${item.quantity}</td>
            <td style="text-align:right">${Number(item.unitPrice).toFixed(2)} DT</td>
            <td style="text-align:right">${(item.quantity * Number(item.unitPrice)).toFixed(2)} DT</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    <div class="total-section">
      <div class="total-row"><span>Sous-total :</span><span>${(order.subtotal || 0).toFixed(2)} DT</span></div>
      <div class="total-row"><span>Livraison :</span><span>${(order.deliveryFee || 0).toFixed(2)} DT</span></div>
      <div class="total-row"><span>TVA (19%) :</span><span>${(order.tax || 0).toFixed(2)} DT</span></div>
      <div class="total-row grand"><span>TOTAL :</span><span>${order.totalAmount.toFixed(2)} DT</span></div>
    </div>
    ${order.notes ? `<div class="notes"><h4>Notes</h4><p>${sanitize(order.notes)}</p></div>` : ''}
    <div class="footer">${sanitize(siteName)} - Plateforme Traiteur Intelligente</div>
  </body></html>`;
}

export default function AdminOrdersPage() {
  const { config } = useSiteStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('');

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const response = await orderService.getAllOrders();
      setOrders(response.data || []);
    } catch (error) {
      toast.error('Erreur lors du chargement des commandes');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      await orderService.updateOrderStatus(orderId, newStatus);
      toast.success('Statut mis a jour');
      loadOrders();
    } catch (error) {
      toast.error('Erreur lors de la mise a jour');
    }
  };

  const handleMarkAsPaid = async (orderId: string) => {
    try {
      await paymentService.markAsPaid(orderId);
      toast.success('Paiement confirme');
      loadOrders();
    } catch {
      toast.error('Erreur lors de la confirmation du paiement');
    }
  };

  const getNextStatus = (currentStatus: string): string | null => {
    const currentIndex = STATUS_FLOW.indexOf(currentStatus);
    if (currentIndex >= 0 && currentIndex < STATUS_FLOW.length - 1) {
      return STATUS_FLOW[currentIndex + 1];
    }
    return null;
  };

  const getStatusConfig = (status: string) => {
    return ORDER_STATUSES.find((s) => s.value === status) || { value: status, label: status, color: 'default' };
  };

  const getPaymentBadge = (order: Order) => {
    const status = order.invoice?.payment?.status;
    if (!status) return <Badge variant="default">--</Badge>;
    const map: Record<string, { label: string; variant: string }> = {
      PENDING: { label: 'En attente', variant: 'warning' },
      COMPLETED: { label: 'Paye', variant: 'success' },
      REFUNDED: { label: 'Rembourse', variant: 'default' },
    };
    const cfg = map[status] || { label: status, variant: 'default' };
    return <Badge variant={cfg.variant as any}>{cfg.label}</Badge>;
  };

  const filteredOrders = orders.filter((order) => {
    const matchesSearch = !searchQuery || 
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.orderNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.userId?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = !filterStatus || order.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const printOrder = (order: Order) => {
    const content = buildOrderPrintHTML(order, config.siteName);
    const w = window.open('', '_blank', 'width=850,height=700');
    if (w) { w.document.write(content); w.document.close(); setTimeout(() => w.print(), 300); }
  };

  const downloadInvoicePDF = async (order: Order) => {
    try {
      const blob = await orderService.downloadInvoice(order.id);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `Facture-${order.invoice?.invoiceNumber || order.id.slice(-6)}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
      toast.success('Facture telechargee');
    } catch {
      toast.error('Erreur lors du telechargement de la facture');
    }
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-medium text-gray-900/90">Gestion des Commandes</h1>
          <p className="text-gray-400 mt-1">Suivi des statuts et des livraisons</p>
        </motion.div>
        <div className="flex items-center gap-3">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border border-gray-200 text-gray-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 bg-white"
          >
            <option value="">Tous les statuts</option>
            {ORDER_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par n ou client..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 bg-white w-64"
            />
          </div>
        </div>
      </div>

      {/* Orders List */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/80 backdrop-blur-xl border border-gray-200 rounded-2xl overflow-hidden"
      >
        {filteredOrders.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            Aucune commande trouvee.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredOrders.map((order) => {
              const status = getStatusConfig(order.status);
              const nextStatus = getNextStatus(order.status);
              const isExpanded = expandedOrder === order.id;

              return (
                <div key={order.id} className={`transition-all duration-200 ${isExpanded ? 'bg-gray-50/50' : 'hover:bg-gray-50/30'}`}>
                  {/* Row Header */}
                  <div 
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 cursor-pointer"
                    onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center text-primary-500">
                        <CubeIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900">#{order.id.slice(-6)}</span>
                          <Badge variant={status.color as any}>{status.label}</Badge>
                          {getPaymentBadge(order)}
                        </div>
                        <span className="text-xs text-gray-400">{formatDate(order.createdAt)}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between sm:justify-end gap-6 flex-1">
                      <div className="text-sm text-gray-500 font-medium">
                        {order.items?.length || 0} articles
                      </div>
                      <div className="font-bold text-primary-600">
                        {order.totalAmount.toFixed(2)} DT
                      </div>
                      <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-full transition-colors">
                        {isExpanded ? <ChevronUpIcon className="h-5 w-5" /> : <ChevronDownIcon className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="px-6 pb-6 pt-2 bg-gray-50/50 border-t border-gray-100/50"
                    >
                      <div className="grid md:grid-cols-2 gap-8">
                        {/* Left: Order Items */}
                        <div>
                          <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-4">Articles commandes</h4>
                          <div className="space-y-3">
                            {order.items?.map((item: any, index: number) => (
                              <div key={index} className="flex justify-between items-center text-sm">
                                <span className="text-gray-600 font-medium">{item.quantity}x {item.platName || 'Article'}</span>
                                <span className="text-gray-900 font-semibold">{(item.unitPrice * item.quantity).toFixed(2)} DT</span>
                              </div>
                            ))}
                          </div>
                          <div className="mt-4 pt-3 border-t border-gray-200 space-y-1 text-sm">
                            <div className="flex justify-between text-gray-400"><span>Sous-total</span><span>{(order.subtotal || 0).toFixed(2)} DT</span></div>
                            <div className="flex justify-between text-gray-400"><span>Livraison</span><span>{(order.deliveryFee || 0).toFixed(2)} DT</span></div>
                            <div className="flex justify-between text-gray-400"><span>TVA (19%)</span><span>{(order.tax || 0).toFixed(2)} DT</span></div>
                            <div className="flex justify-between font-bold text-gray-900 pt-1 border-t border-gray-200"><span>Total</span><span>{order.totalAmount.toFixed(2)} DT</span></div>
                          </div>
                        </div>

                        {/* Right: Delivery & Actions */}
                        <div className="space-y-5">
                          <div>
                            <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Livraison</h4>
                            {order.deliveryAddress ? (
                              <p className="text-sm text-gray-600 leading-relaxed bg-white p-3 rounded-lg border border-gray-200">
                                {order.deliveryAddress.street}, {order.deliveryAddress.city} {order.deliveryAddress.zipCode}
                              </p>
                            ) : (
                              <p className="text-sm text-gray-400">Aucune adresse fournie.</p>
                            )}
                            {order.deliveryDate && (
                              <p className="text-xs text-gray-400 mt-1">
                                Date de livraison: {new Date(order.deliveryDate).toLocaleDateString('fr-FR')}
                              </p>
                            )}
                          </div>

                          {order.notes && (
                            <div>
                              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Notes du client</h4>
                              <p className="text-sm text-gray-600 bg-amber-50/50 p-3 rounded-lg border border-amber-100">{order.notes}</p>
                            </div>
                          )}

                          {/* Invoice Info */}
                          {order.invoice && (
                            <div>
                              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Facture</h4>
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <span>N: {order.invoice.invoiceNumber}</span>
                                {getPaymentBadge(order)}
                              </div>
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="flex flex-wrap gap-2 pt-2">
                            {nextStatus && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleStatusChange(order.id, nextStatus); }}
                                className="px-4 py-2 text-sm font-semibold rounded-xl bg-primary-500 text-white hover:bg-primary-600 transition-colors shadow-sm"
                              >
                                Passer a: {getStatusConfig(nextStatus).label}
                              </button>
                            )}
                            {order.status !== 'CANCELLED' && order.status !== 'DELIVERED' && order.status !== 'DELIVERING' && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleStatusChange(order.id, 'CANCELLED'); }}
                                className="px-4 py-2 text-sm font-semibold rounded-xl border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
                              >
                                Annuler
                              </button>
                            )}
                            {order.invoice?.payment?.status === 'PENDING' && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleMarkAsPaid(order.id); }}
                                className="px-4 py-2 text-sm font-semibold rounded-xl border border-green-200 text-green-600 hover:bg-green-50 transition-colors flex items-center gap-1.5"
                              >
                                <BanknotesIcon className="h-4 w-4" />
                                Confirmer paiement
                              </button>
                            )}
                            <button
                              onClick={(e) => { e.stopPropagation(); printOrder(order); }}
                              className="px-3 py-2 text-sm rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-100 transition-colors flex items-center gap-1.5"
                            >
                              <PrinterIcon className="h-4 w-4" />
                              Imprimer
                            </button>
                            {order.invoice && (
                              <button
                                onClick={(e) => { e.stopPropagation(); downloadInvoicePDF(order); }}
                                className="px-3 py-2 text-sm rounded-xl border border-gray-200 text-blue-500 hover:bg-blue-50 transition-colors flex items-center gap-1.5"
                              >
                                <ArrowDownTrayIcon className="h-4 w-4" />
                                Facture PDF
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}