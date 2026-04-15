export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PREPARING = 'PREPARING',
  READY = 'READY',
  DELIVERING = 'DELIVERING',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

export enum PaymentMethod {
  CARD = 'CARD',
  CASH = 'CASH',
}

export interface Order {
  id: string;
  userId: string;
  orderNumber: string;
  status: OrderStatus;
  subtotal: number;
  deliveryFee: number;
  tax: number;
  totalAmount: number;
  deliveryAddress: DeliveryAddress;
  deliveryDate: Date;
  deliverySlot?: string;
  notes?: string;
  items: OrderItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface DeliveryAddress {
  street: string;
  city: string;
  zipCode: string;
  country: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  platId: string;
  platName: string;
  quantity: number;
  unitPrice: number;
  notes?: string;
}

export interface CreateOrderDto {
  items: CreateOrderItemDto[];
  deliveryAddress: DeliveryAddress;
  deliveryDate: string;
  deliverySlot?: string;
  notes?: string;
}

export interface CreateOrderItemDto {
  platId: string;
  quantity: number;
  notes?: string;
}

export interface UpdateOrderStatusDto {
  status: OrderStatus;
}

export interface Invoice {
  id: string;
  orderId: string;
  invoiceNumber: string;
  amount: number;
  taxAmount: number;
  pdfUrl?: string;
  sentAt?: Date;
  createdAt: Date;
}

export interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  method: PaymentMethod;
  transactionRef?: string;
  status: PaymentStatus;
  paidAt?: Date;
  createdAt: Date;
}
