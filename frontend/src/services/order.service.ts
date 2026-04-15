import api from '@/lib/api';

export interface OrderItem {
  platId: string;
  platName?: string;
  quantity: number;
  unitPrice: number;
  notes?: string;
}

export interface DeliveryAddress {
  street: string;
  city: string;
  zipCode: string;
  country: string;
}

export interface CreateOrderData {
  items: Array<{
    platId: string;
    platName?: string;
    quantity: number;
    unitPrice?: number;
  }>;
  deliveryAddress: DeliveryAddress;
  deliveryDate: string;
  notes?: string;
  paymentMethod?: string;
  subtotal?: number;
  deliveryFee?: number;
  tax?: number;
  total?: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: string;
  subtotal: number;
  deliveryFee: number;
  tax: number;
  totalAmount: number;
  userId?: string;
  deliveryAddress: DeliveryAddress;
  deliveryDate: string;
  deliverySlot?: string;
  notes?: string;
  items?: Array<{
    id: string;
    platId: string;
    platName: string;
    quantity: number;
    unitPrice: number;
    notes?: string;
  }>;
  invoice?: {
    id: string;
    invoiceNumber: string;
    amount: number;
    payment?: {
      id: string;
      method?: string;
      status: string;
      transactionRef?: string;
      paidAt?: string;
    };
  };
  createdAt: string;
}

export const orderService = {
  async createOrder(data: CreateOrderData) {
    const response = await api.post('/orders', data);
    return response.data;
  },

  async getMyOrders(page = 1, limit = 10, status?: string) {
    const response = await api.get('/orders/my-orders', {
      params: { page, limit, status },
    });
    return response.data;
  },

  async getOrderById(id: string) {
    const response = await api.get(`/orders/${id}`);
    return response.data;
  },

  async cancelOrder(id: string) {
    const response = await api.post(`/orders/${id}/cancel`);
    return response.data;
  },

  // Admin
  async getAllOrders(page = 1, limit = 10, status?: string) {
    const response = await api.get('/orders', {
      params: { page, limit, status },
    });
    return response.data;
  },

  async updateOrderStatus(id: string, status: string) {
    const response = await api.patch(`/orders/${id}/status`, { status });
    return response.data;
  },

  async getOrderStats() {
    const response = await api.get('/orders/stats/overview');
    return response.data;
  },

  // Invoices
  async getMyInvoices(page = 1, limit = 10) {
    const response = await api.get('/invoices/my-invoices', {
      params: { page, limit },
    });
    return response.data;
  },

  async getInvoiceByOrderId(orderId: string) {
    const response = await api.get(`/invoices/order/${orderId}`);
    return response.data;
  },

  async getAllInvoices(page = 1, limit = 50) {
    const response = await api.get('/invoices', {
      params: { page, limit },
    });
    return response.data;
  },

  async downloadInvoice(orderId: string) {
    const response = await api.get(`/invoices/order/${orderId}/pdf`, {
      responseType: 'blob',
    });
    return response.data;
  },
};

export interface Invoice {
  id: string;
  invoiceNumber: string;
  orderId: string;
  status: string;
  subtotal: number;
  tax: number;
  totalAmount: number;
  issuedAt: string;
  dueDate: string;
  paidAt?: string;
}
