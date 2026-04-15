import api from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';

export interface Plat {
  id: string;
  name: string;
  description?: string;
  price: number;
  image?: string;
  isVegetarian: boolean;
  isVegan: boolean;
  isHalal: boolean;
  isGlutenFree: boolean;
  spiceLevel: number;
  preparationTime?: number;
  servingSize?: number;
  minServings?: number;
  maxServings?: number;
  isAvailable: boolean;
  categoryId: string;
  category?: {
    id: string;
    name: string;
  };
  allergens?: Array<{
    id: string;
    name: string;
  }>;
  images?: string[];
}

export interface Ingredient {
  id: string;
  name: string;
  description?: string;
  unit: string;
  quantity: number;
  minQuantity: number;
  lowStockThreshold: number;
  isLowStock: boolean;
  supplier?: string;
  costPerUnit?: number;
  expiryDate?: string;
  storageLocation?: string;
  isActive: boolean;
  categoryId: string;
  supplierId?: string | null;
  category?: {
    id: string;
    name: string;
  };
  supplierRef?: {
    id: string;
    name: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  leadTimeDays?: number;
  paymentTerms?: string;
  notes?: string;
  isActive: boolean;
  ingredientsCount: number;
  lowStockIngredientsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SupplierDetail extends Supplier {
  ingredients: Array<{
    id: string;
    name: string;
    unit: string;
    quantity: number;
    costPerUnit?: number | null;
    isLowStock: boolean;
    isActive: boolean;
    updatedAt: string;
  }>;
}

export type PurchaseOrderStatus = 'DRAFT' | 'SENT' | 'RECEIVED' | 'CANCELLED';

export interface PurchaseOrderLine {
  id: string;
  ingredientId: string;
  quantity: number;
  unitCost: number;
  lineTotal: number;
  ingredientName?: string;
  unit?: string;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  status: PurchaseOrderStatus;
  expectedDate?: string | null;
  notes?: string | null;
  subtotal: number;
  sentAt?: string | null;
  receivedAt?: string | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
  supplier?: {
    id: string;
    name: string;
  };
  lines: PurchaseOrderLine[];
}

export interface CreatePurchaseOrderData {
  supplierId: string;
  expectedDate?: string;
  notes?: string;
  lines: Array<{
    ingredientId: string;
    quantity: number;
    unitCost: number;
  }>;
}

export type ExpenseStatus = 'DRAFT' | 'APPROVED' | 'PAID' | 'REJECTED';

export interface Expense {
  id: string;
  title: string;
  category: string;
  amount: number;
  expenseDate: string;
  supplierName?: string | null;
  paymentMethod?: string | null;
  notes?: string | null;
  status: ExpenseStatus;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateExpenseData {
  title: string;
  category: string;
  amount: number;
  expenseDate: string;
  supplierName?: string;
  paymentMethod?: string;
  notes?: string;
}

export interface AuditLog {
  id: string;
  module: string;
  action: string;
  entityType: string;
  entityId: string;
  message: string;
  actorId?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

export interface IngredientCategory {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  image?: string;
  imageUrl?: string;
  displayOrder?: number;
  order?: number;
  isActive?: boolean;
  _count?: {
    plats: number;
  };
}

interface UploadImageResult {
  url?: string;
  publicId?: string;
  width?: number;
  height?: number;
}

interface UploadImageResponse {
  success: boolean;
  url?: string;
  data?: UploadImageResult;
}

function normalizeCategory(category: any): Category {
  return {
    ...category,
    image: category?.image || category?.imageUrl || undefined,
  };
}

function normalizePlat(plat: any): Plat {
  const firstImage = Array.isArray(plat?.images) ? plat.images[0] : undefined;

  return {
    ...plat,
    price: typeof plat?.price === 'number' ? plat.price : Number(plat?.price || 0),
    image: plat?.image || plat?.imageUrl || firstImage || undefined,
  };
}

function mapPlatPayload(data: Partial<Plat> | FormData): Partial<Plat> | FormData {
  if (data instanceof FormData) return data;

  const payload: any = { ...data };
  if (payload.image !== undefined) {
    payload.images = payload.image ? [payload.image] : [];
    delete payload.image;
  }

  return payload;
}

export interface PlatsFilters {
  categoryId?: string;
  isVegetarian?: boolean;
  isVegan?: boolean;
  isHalal?: boolean;
  isGlutenFree?: boolean;
  spiceLevel?: number;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  page?: number;
  limit?: number;
}

export const catalogService = {
  // Categories
  async getCategories() {
    const response = await api.get('/categories');
    const payload = response.data;

    if (Array.isArray(payload?.data)) {
      return {
        ...payload,
        data: payload.data.map(normalizeCategory),
      };
    }

    return payload;
  },

  async getCategoryById(id: string) {
    const response = await api.get(`/categories/${id}`);
    const payload = response.data;

    if (payload?.data) {
      return {
        ...payload,
        data: normalizeCategory(payload.data),
      };
    }

    return payload;
  },

  async createCategory(data: Partial<Category>) {
    const response = await api.post('/categories', data);
    return response.data;
  },

  async updateCategory(id: string, data: Partial<Category>) {
    const response = await api.put(`/categories/${id}`, data);
    return response.data;
  },

  async deleteCategory(id: string) {
    const response = await api.delete(`/categories/${id}`);
    return response.data;
  },

  // Plats
  async getPlats(filters?: PlatsFilters) {
    const response = await api.get('/plats', { params: filters });
    const payload = response.data;

    if (Array.isArray(payload?.data)) {
      return {
        ...payload,
        data: payload.data.map(normalizePlat),
      };
    }

    return payload;
  },

  async getPlatById(id: string) {
    const response = await api.get(`/plats/${id}`);
    const payload = response.data;

    if (payload?.data) {
      return {
        ...payload,
        data: normalizePlat(payload.data),
      };
    }

    return payload;
  },

  async createPlat(data: Partial<Plat> | FormData) {
    const response = await api.post('/plats', mapPlatPayload(data));
    return response.data;
  },

  async updatePlat(id: string, data: Partial<Plat> | FormData) {
    const response = await api.put(`/plats/${id}`, mapPlatPayload(data));
    return response.data;
  },

  async deletePlat(id: string) {
    const response = await api.delete(`/plats/${id}`);
    return response.data;
  },

  async uploadImage(file: File) {
    const formData = new FormData();
    formData.append('image', file);

    const token = useAuthStore.getState().accessToken;
    const response = await api.post('/upload/single', formData, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });

    const payload = response.data as UploadImageResponse;
    return {
      ...payload,
      url: payload?.url || payload?.data?.url,
    };
  },

  // Allergens
  async getAllergens() {
    const response = await api.get('/allergens');
    return response.data;
  },

  // Stock
  async getAllPlatsStock() {
    const response = await api.get('/plats/stock/all');
    return response.data;
  },

  async getLowStockItems() {
    const response = await api.get('/plats/stock/low');
    return response.data;
  },

  async updateStock(id: string, stock: number, lowStockThreshold?: number) {
    const response = await api.patch(`/plats/${id}/stock`, { stock, lowStockThreshold });
    return response.data;
  },

  async notifyLowStock() {
    const response = await api.post('/plats/stock/notify');
    return response.data;
  },

  // Ingredient Stock (new)
  async getAllIngredientsStock() {
    const response = await api.get('/ingredients/stock/all');
    return response.data;
  },

  async getLowStockIngredients() {
    const response = await api.get('/ingredients/stock/low');
    return response.data;
  },

  async updateIngredientStock(id: string, quantity: number, lowStockThreshold?: number) {
    const response = await api.patch(`/ingredients/stock/${id}`, { quantity, lowStockThreshold });
    return response.data;
  },

  async notifyLowStockIngredients() {
    const response = await api.post('/ingredients/stock/notify');
    return response.data;
  },

  // Ingredient CRUD
  async getIngredients() {
    const response = await api.get('/ingredients');
    return response.data;
  },

  async getIngredientById(id: string) {
    const response = await api.get(`/ingredients/${id}`);
    return response.data;
  },

  async createIngredient(data: Partial<Ingredient>) {
    const response = await api.post('/ingredients', data);
    return response.data;
  },

  async updateIngredient(id: string, data: Partial<Ingredient>) {
    const response = await api.patch(`/ingredients/${id}`, data);
    return response.data;
  },

  async deleteIngredient(id: string) {
    const response = await api.delete(`/ingredients/${id}`);
    return response.data;
  },

  // Ingredient Categories
  async getIngredientCategories() {
    const response = await api.get('/ingredients/categories/all');
    return response.data;
  },

  async createIngredientCategory(data: Partial<IngredientCategory>) {
    const response = await api.post('/ingredients/categories', data);
    return response.data;
  },

  async updateIngredientCategory(id: string, data: Partial<IngredientCategory>) {
    const response = await api.patch(`/ingredients/categories/${id}`, data);
    return response.data;
  },

  async deleteIngredientCategory(id: string) {
    const response = await api.delete(`/ingredients/categories/${id}`);
    return response.data;
  },

  // Suppliers
  async getSuppliers(search?: string, includeInactive = false) {
    const response = await api.get('/ingredients/suppliers', {
      params: {
        search,
        includeInactive,
      },
    });
    return response.data;
  },

  async getSupplierById(id: string) {
    const response = await api.get(`/ingredients/suppliers/${id}`);
    return response.data;
  },

  async createSupplier(data: Partial<Supplier>) {
    const response = await api.post('/ingredients/suppliers', data);
    return response.data;
  },

  async updateSupplier(id: string, data: Partial<Supplier>) {
    const response = await api.patch(`/ingredients/suppliers/${id}`, data);
    return response.data;
  },

  async deleteSupplier(id: string) {
    const response = await api.delete(`/ingredients/suppliers/${id}`);
    return response.data;
  },

  // Purchase Orders
  async getPurchaseOrders(params?: {
    status?: PurchaseOrderStatus;
    supplierId?: string;
    search?: string;
  }) {
    const response = await api.get('/ingredients/purchase-orders', { params });
    return response.data;
  },

  async createPurchaseOrder(data: CreatePurchaseOrderData) {
    const response = await api.post('/ingredients/purchase-orders', data);
    return response.data;
  },

  async updatePurchaseOrderStatus(id: string, status: PurchaseOrderStatus) {
    const response = await api.patch(`/ingredients/purchase-orders/${id}/status`, { status });
    return response.data;
  },

  // Expenses
  async getExpenses(params?: {
    status?: ExpenseStatus;
    category?: string;
    from?: string;
    to?: string;
    search?: string;
  }) {
    const response = await api.get('/ingredients/expenses', { params });
    return response.data;
  },

  async createExpense(data: CreateExpenseData) {
    const response = await api.post('/ingredients/expenses', data);
    return response.data;
  },

  async updateExpenseStatus(id: string, status: ExpenseStatus) {
    const response = await api.patch(`/ingredients/expenses/${id}/status`, { status });
    return response.data;
  },

  async deleteExpense(id: string) {
    const response = await api.delete(`/ingredients/expenses/${id}`);
    return response.data;
  },

  // Audit Logs
  async getAuditLogs(params?: {
    module?: string;
    search?: string;
    limit?: number;
  }) {
    const response = await api.get('/ingredients/audit-logs', { params });
    return response.data;
  },

};
