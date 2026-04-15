import api from '@/lib/api';

const RETRY_DELAY_MS = 700;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
    const maxAttempts = 3;
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const { data } = await api.get('/recommendations/plats', { params });
        return data;
      } catch (error: any) {
        lastError = error;
        const status = error?.response?.status;
        const isRetriable = status === 503 || status === 502 || !status;
        const canRetry = attempt < maxAttempts;

        if (!isRetriable || !canRetry) {
          throw error;
        }

        await wait(RETRY_DELAY_MS * attempt);
      }
    }

    throw lastError;
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
