import api from '../lib/api';

export interface DemandForecast {
  date: string;
  predicted_orders: number;
  predicted_revenue: number;
  confidence_lower: number;
  confidence_upper: number;
  by_category: Record<string, number>;
  factors: string[];
}

export interface ForecastResponse {
  generated_at: string;
  period: 'daily' | 'weekly' | 'monthly';
  days_ahead: number;
  forecasts: DemandForecast[];
  overall_confidence: number;
  key_insights: string[];
}

export interface StockAlert {
  plat_id: string;
  plat_name: string;
  predicted_demand: number;
  current_stock: number;
  stockout_risk: 'HIGH' | 'MEDIUM' | 'LOW';
  days_until_shortage: number | null;
  recommended_prep: number;
}

export interface ChefDashboard {
  date: string;
  total_predicted_orders: number;
  total_predicted_revenue: number;
  vs_last_week_change: number;
  top_dishes_today: Array<{ name: string; quantity: number }>;
  stock_alerts: StockAlert[];
  weather_impact: string | null;
  special_events: string[];
  prep_recommendations: Array<{
    dish: string;
    quantity: number;
    priority: 'high' | 'medium' | 'low';
  }>;
}

export interface ForecastAccuracy {
  mape: number | null;
  rmse: number | null;
  days_tracked: number;
}

export interface WeeklyTrend {
  period_weeks: number;
  weekday_patterns: Record<string, number>;
  insights: string[];
  chart_data: Array<{ day: string; predicted: number }>;
}

class ForecastingService {
  async getDemandForecast(days: number = 7, category?: string): Promise<ForecastResponse> {
    const params = new URLSearchParams();
    params.append('days', days.toString());
    params.append('demo', 'true');
    if (category) params.append('category', category);
    
    const response = await api.get(`/forecast/demand?${params.toString()}`);
    return response.data;
  }

  async getChefDashboard(): Promise<ChefDashboard> {
    const response = await api.get('/chef/dashboard?demo=true');
    return response.data;
  }

  async getStockAlerts(minRisk: 'HIGH' | 'MEDIUM' | 'LOW' = 'MEDIUM'): Promise<StockAlert[]> {
    const response = await api.get(`/chef/alerts?min_risk=${minRisk}`);
    return response.data;
  }

  async getForecastAccuracy(days: number = 30): Promise<{ metrics: ForecastAccuracy; explanation: Record<string, string> }> {
    const response = await api.get(`/forecast/accuracy?days=${days}`);
    return response.data;
  }

  async getWeeklyTrends(weeks: number = 4): Promise<WeeklyTrend> {
    const response = await api.get(`/forecast/trends/weekly?weeks=${weeks}&demo=true`);
    return response.data;
  }

  async getDailyInsights(targetDate?: string): Promise<{
    date: string;
    predicted_orders: number;
    confidence_interval: { low: number; high: number };
    recommendations: { staffing_level: string; prep_level: string };
    factors: string[];
  }> {
    const params = targetDate ? `?target_date=${targetDate}` : '';
    const response = await api.get(`/forecast/insights/daily${params}`);
    return response.data;
  }

  async getPrepGuide(targetDate?: string): Promise<{
    date: string;
    total_predicted_items: number;
    priority_levels: {
      high: { description: string; dishes: any[] };
      medium: { description: string; dishes: any[] };
      low: { description: string; dishes: any[] };
    };
    timing_recommendations: string[];
  }> {
    const params = targetDate ? `?target_date=${targetDate}` : '';
    const response = await api.get(`/chef/prep-guide${params}`);
    return response.data;
  }

  async submitActualResults(
    date: string,
    actualOrders: number,
    stockouts?: string[],
    notes?: string
  ): Promise<{ message: string; data: any; next_step: string }> {
    const response = await api.post('/chef/feedback', {
      date,
      actual_orders: actualOrders,
      stockouts,
      notes
    });
    return response.data;
  }
}

export const forecastingService = new ForecastingService();
