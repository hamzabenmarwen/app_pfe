import api from '@/lib/api';

export interface IngredientDemandItem {
  ingredient_id: string;
  name: string;
  unit: string;
  predicted_demand: number;
  current_stock: number;
  needed_quantity: number;
  urgency: 'HIGH' | 'MEDIUM' | 'LOW';
  cost_estimate: number | null;
  supplier_id: string | null;
}

export interface PurchaseOrderSuggestion {
  supplier_id: string;
  supplier_name: string;
  lead_time_days: number;
  priority: string;
  items: IngredientDemandItem[];
  total_cost_estimate: number;
  suggested_order_date: string;
}

export interface ProfitabilityItem {
  plat_id: string;
  name: string;
  price: number;
  ingredient_cost: number;
  labor_cost_estimate: number;
  total_cost_estimate: number;
  margin: number;
  margin_percent: number;
  volume_30d: number;
  revenue_30d: number;
  profit_contribution_30d: number;
  category_id: string | null;
}

export interface AnomalyItem {
  date: string;
  order_count: number;
  revenue: number;
  avg_order_value: number;
  expected_order_count: number | null;
  expected_revenue: number | null;
  severity: 'HIGH' | 'MEDIUM';
  reasons: string[];
}

export interface KitchenDashboard {
  date: string;
  predicted_orders_today: number;
  actual_orders_today: number;
  variance_percent: number;
  top_dishes_last_7d: Array<{ name: string; quantity: number }>;
  ingredient_alerts: IngredientDemandItem[];
  purchase_order_suggestions: PurchaseOrderSuggestion[];
  profitability_insights: {
    top_margin_dishes: ProfitabilityItem[];
    low_margin_high_volume: ProfitabilityItem[];
  };
  anomalies: AnomalyItem[];
}

class KitchenService {
  async getDashboard(): Promise<KitchenDashboard> {
    const { data } = await api.get('/kitchen/dashboard');
    return data;
  }

  async getIngredientDemand(daysAhead: number = 7): Promise<{ forecast_days: number; items: IngredientDemandItem[] }> {
    const { data } = await api.get(`/kitchen/ingredients/demand?days_ahead=${daysAhead}`);
    return data;
  }

  async getPurchaseOrderSuggestions(): Promise<{ suggestions: PurchaseOrderSuggestion[] }> {
    const { data } = await api.get('/kitchen/purchase-orders/suggestions');
    return data;
  }

  async getProfitability(): Promise<{ dishes: ProfitabilityItem[] }> {
    const { data } = await api.get('/kitchen/profitability');
    return data;
  }

  async getAnomalies(daysBack: number = 30): Promise<{ period_days: number; anomalies: AnomalyItem[] }> {
    const { data } = await api.get(`/kitchen/anomalies?days_back=${daysBack}`);
    return data;
  }
}

export const kitchenService = new KitchenService();
