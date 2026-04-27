import api from '@/lib/api';

export interface OptimizedMenuItem {
  id: string;
  name: string;
  price: number;
  description: string | null;
  category: string;
  calories: number | null;
  isVegetarian: boolean;
  isVegan: boolean;
  isHalal: boolean;
  isGlutenFree: boolean;
}

export interface OptimizedMenuRequest {
  event_type: string;
  guest_count: number;
  budget_per_person: number;
  service_type?: string;
  vegetarian_ratio?: number;
  vegan_ratio?: number;
  halal_ratio?: number;
  gluten_free_ratio?: number;
  min_starters?: number;
  min_mains?: number;
  min_desserts?: number;
  max_items_per_course?: number;
}

export interface OptimizedMenuResponse {
  event_type: string;
  guest_count: number;
  budget_per_person: number;
  starters: OptimizedMenuItem[];
  mains: OptimizedMenuItem[];
  desserts: OptimizedMenuItem[];
  estimated_price_per_person: number;
  total_cost: number;
  dietary_coverage: Record<string, number>;
  nutritional_summary: Record<string, number | null>;
  waste_score: number;
  optimization_status: string;
  solver_time_ms: number;
  constraint_violations: string[];
}

class OptimizerService {
  async optimizeEventMenu(payload: OptimizedMenuRequest): Promise<OptimizedMenuResponse> {
    const { data } = await api.post('/optimizer/event-menu', payload);
    return data;
  }
}

export const optimizerService = new OptimizerService();
