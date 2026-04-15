export enum EventType {
  WEDDING = 'WEDDING',
  BIRTHDAY = 'BIRTHDAY',
  CORPORATE = 'CORPORATE',
  GRADUATION = 'GRADUATION',
  BABY_SHOWER = 'BABY_SHOWER',
  COCKTAIL = 'COCKTAIL',
  CONFERENCE = 'CONFERENCE',
  PRIVATE = 'PRIVATE',
  OTHER = 'OTHER',
}

export enum EventStatus {
  PENDING = 'PENDING',
  QUOTED = 'QUOTED',
  CONFIRMED = 'CONFIRMED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum QuoteStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
}

export interface Event {
  id: string;
  userId: string;
  eventType: EventType;
  title?: string;
  description?: string;
  eventDate: Date;
  guestCount: number;
  budgetMin?: number;
  budgetMax?: number;
  location?: string;
  status: EventStatus;
  quotes: Quote[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateEventDto {
  eventType: EventType;
  title?: string;
  description?: string;
  eventDate: string;
  guestCount: number;
  budgetMin?: number;
  budgetMax?: number;
  location?: string;
}

export interface Quote {
  id: string;
  eventId: string;
  quoteNumber: string;
  items: QuoteItem[];
  totalAmount: number;
  status: QuoteStatus;
  validUntil: Date;
  pdfUrl?: string;
  notes?: string;
  createdAt: Date;
}

export interface QuoteItem {
  id: string;
  quoteId: string;
  platId: string;
  platName: string;
  quantity: number;
  unitPrice: number;
  notes?: string;
}

export interface CreateQuoteDto {
  eventId: string;
  items: CreateQuoteItemDto[];
  validUntil: string;
  notes?: string;
}

export interface CreateQuoteItemDto {
  platId: string;
  quantity: number;
  unitPrice: number;
  notes?: string;
}

export interface UpdateQuoteStatusDto {
  status: QuoteStatus;
}
