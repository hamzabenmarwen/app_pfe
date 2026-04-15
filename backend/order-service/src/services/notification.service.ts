const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';

interface NotifyAdminData {
  orderNumber: string;
  totalAmount: number;
  deliveryDate: string;
  itemCount: number;
  customerName?: string;
}

/**
 * Notify the admin via email when a new order is placed.
 * Calls the auth service which owns the email infrastructure.
 */
export async function notifyAdminNewOrder(data: NotifyAdminData): Promise<void> {
  try {
    await fetch(`${AUTH_SERVICE_URL}/api/internal/notify-admin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'NEW_ORDER',
        subject: `Nouvelle commande #${data.orderNumber}`,
        message: `Commande #${data.orderNumber} — ${data.itemCount} article(s) — ${data.totalAmount.toFixed(2)} DT — Livraison: ${data.deliveryDate}`,
        data,
      }),
    });
  } catch {
    // Non-blocking: don't fail the order if notification fails
  }
}

/**
 * Notify the admin via email when a new event request is received.
 */
export async function notifyAdminNewEvent(data: {
  eventTitle: string;
  eventType: string;
  eventDate: string;
  guestCount: number;
  customerName?: string;
}): Promise<void> {
  try {
    await fetch(`${AUTH_SERVICE_URL}/api/internal/notify-admin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'NEW_EVENT',
        subject: `Nouvelle demande d'événement: ${data.eventTitle}`,
        message: `${data.eventType} — ${data.guestCount} invités — ${data.eventDate}`,
        data,
      }),
    });
  } catch {
    // Non-blocking
  }
}
