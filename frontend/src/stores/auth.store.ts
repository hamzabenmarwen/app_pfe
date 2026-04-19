import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: 'CLIENT' | 'ADMIN';
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  setUser: (user: User) => void;
  setTokens: (accessToken: string) => void;
  login: (user: User, accessToken: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isAdmin: false,

      setUser: (user) =>
        set({
          user,
          isAdmin: user.role === 'ADMIN',
        }),

      setTokens: (accessToken) =>
        set({
          accessToken,
          isAuthenticated: true,
        }),

      login: (user, accessToken) =>
        set({
          user,
          accessToken,
          isAuthenticated: true,
          isAdmin: user.role === 'ADMIN',
        }),

      logout: () =>
        set({
          user: null,
          accessToken: null,
          isAuthenticated: false,
          isAdmin: false,
        }),
    }),
    {
      name: 'assiette-gala-auth',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
        isAdmin: state.isAdmin,
      }),
    }
  )
);
