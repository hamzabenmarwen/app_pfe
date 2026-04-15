import api from '@/lib/api';

export interface CreatePaymentData {
  orderId: string;
}

export const paymentService = {
  async createCashPayment(orderId: string) {
    const response = await api.post('/payments/create', { orderId });
    return response.data;
  },


  async initiateFlouci(orderId: string) {
    const response = await api.post('/payments/flouci/initiate', { orderId });
    return response.data;
  },

  async verifyFlouci(paymentId: string) {
    const response = await api.get(`/payments/flouci/verify/${paymentId}`);
    return response.data;
  },

  async getPaymentStatus(orderId: string) {
    const response = await api.get(`/payments/order/${orderId}`);
    return response.data;
  },

  async markAsPaid(orderId: string) {
    const response = await api.post(`/payments/order/${orderId}/complete`);
    return response.data;
  },

  async refundPayment(orderId: string) {
    const response = await api.post(`/payments/order/${orderId}/refund`);
    return response.data;
  },
};

export function getPaymentMethodLabel(method?: string): string {
  const labels: Record<string, string> = {
    CASH: 'Espèces',
    CARD: 'Carte bancaire',
    FLOUCI: 'Flouci',
  };
  return labels[method || ''] || method || 'Non spécifié';
}

