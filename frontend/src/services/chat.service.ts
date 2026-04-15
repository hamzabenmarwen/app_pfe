import api from '@/lib/api';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

export interface ChatResponse {
  reply: string;
  userId: string;
}

export interface ChatHistory {
  userId: string;
  messages: ChatMessage[];
  totalMessages: number;
}

const chatService = {
  /**
   * Send a message to the AI chatbot
   */
  async sendMessage(userId: string, message: string): Promise<ChatResponse> {
    const { data } = await api.post('/chat/message', { userId, message });
    return data;
  },

  /**
   * Get conversation history for a user
   */
  async getHistory(userId: string): Promise<ChatHistory> {
    const { data } = await api.get(`/chat/history/${userId}`);
    return data;
  },

  /**
   * Clear conversation history
   */
  async clearHistory(userId: string): Promise<void> {
    await api.delete(`/chat/history/${userId}`);
  },

  /**
   * Refresh the AI knowledge base (admin only)
   */
  async refreshKnowledge(): Promise<{ message: string }> {
    const { data } = await api.post('/chat/refresh-knowledge');
    return data;
  },
};

export default chatService;
