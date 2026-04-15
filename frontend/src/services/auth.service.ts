import api from '@/lib/api';

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export const authService = {
  async login(data: LoginData) {
    const response = await api.post('/auth/login', data);
    return response.data;
  },

  async register(data: RegisterData) {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  async logout(refreshToken: string) {
    const response = await api.post('/auth/logout', { refreshToken });
    return response.data;
  },

  async refresh(refreshToken: string) {
    const response = await api.post('/auth/refresh', { refreshToken });
    return response.data;
  },

  async getProfile() {
    const response = await api.get('/users/me');
    return response.data;
  },

  async exportMyData() {
    const response = await api.get('/auth/me/export');
    return response.data;
  },

  async deleteMyAccount() {
    const response = await api.delete('/auth/me/delete');
    return response.data;
  },

  async updateProfile(data: Partial<RegisterData>) {
    const response = await api.put('/users/profile', data);
    return response.data;
  },

  async changePassword(data: { currentPassword: string; newPassword: string }) {
    const response = await api.put('/users/change-password', {
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    });
    return response.data;
  },

  // Addresses
  async getAddresses() {
    const response = await api.get('/addresses');
    return response.data;
  },

  async addAddress(data: Omit<Address, 'id'>) {
    const response = await api.post('/addresses', data);
    return response.data;
  },

  async updateAddress(id: string, data: Partial<Address>) {
    const response = await api.put(`/addresses/${id}`, data);
    return response.data;
  },

  async deleteAddress(id: string) {
    const response = await api.delete(`/addresses/${id}`);
    return response.data;
  },

  async setDefaultAddress(id: string) {
    const response = await api.patch(`/addresses/${id}/set-default`);
    return response.data;
  },
};

export interface Address {
  id: string;
  label: string;
  street: string;
  city: string;
  zipCode: string;
  country: string;
  isDefault: boolean;
}
