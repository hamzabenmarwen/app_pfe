import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  platId: string;
  platName: string;
  unitPrice: number;
  quantity: number;
  image?: string;
}

interface CartState {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (platId: string) => void;
  updateQuantity: (platId: string, quantity: number) => void;
  clearCart: () => void;
  total: () => number;
  itemCount: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) =>
        set((state) => {
          const existingItem = state.items.find((i) => i.platId === item.platId);
          if (existingItem) {
            return {
              items: state.items.map((i) =>
                i.platId === item.platId
                  ? { ...i, quantity: i.quantity + 1 }
                  : i
              ),
            };
          }
          return {
            items: [...state.items, { ...item, quantity: 1 }],
          };
        }),

      removeItem: (platId) =>
        set((state) => ({
          items: state.items.filter((i) => i.platId !== platId),
        })),

      updateQuantity: (platId, quantity) =>
        set((state) => {
          if (quantity <= 0) {
            return {
              items: state.items.filter((i) => i.platId !== platId),
            };
          }
          return {
            items: state.items.map((i) =>
              i.platId === platId ? { ...i, quantity } : i
            ),
          };
        }),

      clearCart: () => set({ items: [] }),

      total: () => {
        return get().items.reduce(
          (sum, item) => sum + item.unitPrice * item.quantity,
          0
        );
      },

      itemCount: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0);
      },
    }),
    {
      name: 'assiette-gala-cart',
    }
  )
);
