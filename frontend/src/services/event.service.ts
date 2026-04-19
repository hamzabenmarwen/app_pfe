import api from '@/lib/api';

export interface Venue {
  name?: string;
  address: string;
  city: string;
  zipCode: string;
  country: string;
}

export interface DietaryRequirements {
  vegetarian?: number;
  vegan?: number;
  halal?: number;
  glutenFree?: number;
  other?: string;
}

export interface CreateEventData {
  name: string;
  eventType: string;
  eventDate: string;
  startTime?: string;
  endTime?: string;
  venue?: Venue;
  guestCount: number;
  guestCountMin?: number;
  guestCountMax?: number;
  dietaryRequirements?: DietaryRequirements;
  allergens?: string[];
  serviceType?: string;
  description?: string;
  specialRequests?: string;
  budget?: number;
  budgetFlexible?: boolean;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
}

export interface Event {
  id: string;
  name: string;
  eventType: string;
  type: string;
  status: string;
  eventDate: string;
  date: string;
  startTime?: string;
  endTime?: string;
  venue?: Venue;
  location?: string;
  guestCount: number;
  budget?: number;
  description?: string;
  menuItems: Array<{
    id: string;
    platId: string;
    platName: string;
    quantity?: number;
  }>;
  quotes: Quote[];
  createdAt: string;
}

export interface Quote {
  id: string;
  quoteNumber: string;
  status: string;
  subtotal: number;
  serviceFee: number;
  deliveryFee: number;
  tax: number;
  discount: number;
  totalAmount: number;
  validUntil: string;
  notes?: string;
  termsConditions?: string;
  items: Array<{
    id: string;
    name: string;
    description?: string;
    category?: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    notes?: string;
  }>;
  createdAt: string;
}

export interface EventInvoice {
  id: string;
  invoiceNumber: string;
  eventId: string;
  quoteId: string;
  status: string;
  subtotal: number;
  serviceFee: number;
  deliveryFee: number;
  tax: number;
  discount: number;
  totalAmount: number;
  issuedAt: string;
  dueDate: string;
  paidAt?: string;
  event?: {
    id: string;
    name: string;
    eventDate: string;
  };
  quote?: {
    id: string;
    quoteNumber: string;
  };
  payment?: {
    id: string;
    amount: number;
    method: 'CASH' | 'FLOUCI';
    status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
    transactionRef?: string;
    paymentUrl?: string;
    paidAt?: string;
  } | null;
}

function normalizeEventPayload(data: Partial<CreateEventData>) {
  const payload: Record<string, any> = { ...data };

  if (payload.eventDate && typeof payload.eventDate === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(payload.eventDate)) {
      payload.eventDate = new Date(`${payload.eventDate}T12:00:00.000Z`).toISOString();
    } else {
      const parsedDate = new Date(payload.eventDate);
      if (!Number.isNaN(parsedDate.getTime())) {
        payload.eventDate = parsedDate.toISOString();
      }
    }
  }

  const optionalStringFields = [
    'startTime',
    'endTime',
    'serviceType',
    'description',
    'specialRequests',
    'contactName',
    'contactPhone',
    'contactEmail',
  ];

  optionalStringFields.forEach((field) => {
    const value = payload[field];
    if (typeof value === 'string' && value.trim() === '') {
      delete payload[field];
    }
  });

  const optionalNumberFields = ['budget', 'guestCountMin', 'guestCountMax'];
  optionalNumberFields.forEach((field) => {
    const value = payload[field];
    if (value === null || value === undefined || Number.isNaN(value)) {
      delete payload[field];
      return;
    }

    if (field === 'budget' && typeof value === 'number' && value <= 0) {
      delete payload[field];
    }
  });

  if (payload.venue) {
    const venue = payload.venue as Venue;
    const hasRequiredVenueFields = !!(venue.address && venue.city && venue.zipCode && venue.country);
    if (!hasRequiredVenueFields) {
      delete payload.venue;
    }
  }

  return payload;
}

export const eventService = {
  async createEvent(data: CreateEventData) {
    const payload = normalizeEventPayload(data);
    const response = await api.post('/events', payload);
    return response.data;
  },

  async getMyEvents(page = 1, limit = 10, status?: string) {
    const response = await api.get('/events/my-events', {
      params: { page, limit, status },
    });
    return response.data;
  },

  async getEventById(id: string) {
    const response = await api.get(`/events/${id}`);
    return response.data;
  },

  async updateEvent(id: string, data: Partial<CreateEventData>) {
    const payload = normalizeEventPayload(data);
    const response = await api.put(`/events/${id}`, payload);
    return response.data;
  },

  async deleteEvent(id: string) {
    const response = await api.delete(`/events/${id}`);
    return response.data;
  },

  async addMenuItem(eventId: string, item: { platId: string; platName: string; quantity?: number }) {
    const response = await api.post(`/events/${eventId}/menu-items`, item);
    return response.data;
  },

  async removeMenuItem(eventId: string, itemId: string) {
    const response = await api.delete(`/events/${eventId}/menu-items/${itemId}`);
    return response.data;
  },

  async requestQuote(eventId: string) {
    const response = await api.post(`/events/${eventId}/request-quote`);
    return response.data;
  },

  // Quotes
  async acceptQuote(quoteId: string) {
    const response = await api.post(`/quotes/${quoteId}/accept`);
    return response.data;
  },

  async rejectQuote(quoteId: string) {
    const response = await api.post(`/quotes/${quoteId}/reject`);
    return response.data;
  },

  // Admin
  async getAllEvents(page = 1, limit = 10, status?: string, eventType?: string) {
    const response = await api.get('/events', {
      params: { page, limit, status, eventType },
    });
    return response.data;
  },

  async updateEventStatus(id: string, status: string) {
    const response = await api.patch(`/events/${id}/status`, { status });
    return response.data;
  },

  async getAllQuotes(page = 1, limit = 50, status?: string) {
    const response = await api.get('/quotes', {
      params: { page, limit, status },
    });
    return response.data;
  },

  async createQuote(eventId: string, data: any) {
    const response = await api.post(`/quotes/event/${eventId}`, data);
    return response.data;
  },

  async sendQuote(quoteId: string) {
    const response = await api.post(`/quotes/${quoteId}/send`);
    return response.data;
  },

  async getQuoteByNumber(quoteNumber: string) {
    const response = await api.get(`/quotes/view/${quoteNumber}`);
    return response.data;
  },

  async getMyEventInvoices(page = 1, limit = 20) {
    const response = await api.get('/event-invoices/my-invoices', {
      params: { page, limit },
    });
    return response.data;
  },

  async getAllEventInvoices(page = 1, limit = 50, status?: string, from?: string, to?: string) {
    const response = await api.get('/event-invoices', {
      params: { page, limit, status, from, to },
    });
    return response.data;
  },

  async markEventInvoicePaid(invoiceId: string) {
    const response = await api.patch(`/event-invoices/${invoiceId}/mark-paid`);
    return response.data;
  },

  async initiateEventInvoiceFlouciPayment(invoiceId: string) {
    const response = await api.post(`/event-invoices/${invoiceId}/payments/flouci/initiate`);
    return response.data;
  },

  async refreshEventInvoiceFlouciPayment(invoiceId: string) {
    const response = await api.post(`/event-invoices/${invoiceId}/payments/flouci/refresh`);
    return response.data;
  },

  async getEventInvoicePaymentStatus(invoiceId: string) {
    const response = await api.get(`/event-invoices/${invoiceId}/payment-status`);
    return response.data;
  },

  async getEventStats() {
    const response = await api.get('/events/stats/overview');
    return response.data;
  },

  // Templates
  async getTemplates(eventType?: string) {
    const response = await api.get('/templates', { params: { eventType } });
    return response.data;
  },
};
