import api from '@/lib/api';

export interface PlatRecommendation {
  id: string;
  name: string;
  description?: string;
  price: number;
  image?: string;
  category?: string;
  score: number;
  reason: string;
}

export interface RecommendationsResponse {
  recommendations: PlatRecommendation[];
  strategy: string;
  userId?: string;
}

export interface EventMenuSuggestion {
  starters: PlatRecommendation[];
  mains: PlatRecommendation[];
  desserts: PlatRecommendation[];
  estimatedPricePerPerson: number;
  totalEstimate: number;
}

export interface EventMenuResponse {
  eventType: string;
  guestCount: number;
  suggestions: EventMenuSuggestion;
}

const recommendationService = {
  /**
   * Get personalized plat recommendations
   */
  async getRecommendations(params?: {
    userId?: string;
    category?: string;
    dietary?: string;
    limit?: number;
  }): Promise<RecommendationsResponse> {
    const { data } = await api.get('/recommendations/plats', { params });
    return data;
  },

  /**
   * Get AI-powered event menu suggestions
   */
  async getEventMenuSuggestions(
    eventType: string,
    guestCount: number,
    budget?: number,
    preferences?: string[]
  ): Promise<EventMenuResponse> {
    const { data } = await api.post('/recommendations/event-menu', {
      eventType,
      guestCount,
      budget,
      preferences,
    });
    return data;
  },
};

export default recommendationService;
