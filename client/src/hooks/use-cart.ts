import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Product } from '@shared/schema';

// A cart item can represent a base product or a specific variant of a product.
// The cartKey uniquely identifies the combination of product + variant + comment.
export interface CartItem {
  cartKey: string;       // `${productId}-${variantId ?? 'base'}`
  id: number;            // product id
  variantId?: number;
  name: string;
  variantLabel?: string;
  price: string;         // effective price (variant price OR product price)
  imageUrl: string;      // effective image (variant image OR product image)
  category: string;
  quantity: number;
  comment?: string;
}

interface AddItemOptions {
  product: Product;
  variantId?: number;
  variantLabel?: string;
  variantPrice?: string;
  variantImageUrl?: string;
  quantity?: number;
  comment?: string;
}

interface CartStore {
  items: CartItem[];
  addItem: (opts: AddItemOptions) => void;
  removeItem: (cartKey: string) => void;
  updateQuantity: (cartKey: string, quantity: number) => void;
  clearCart: () => void;
  isOpen: boolean;
  toggleCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  total: number;
}

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      toggleCart: () => set({ isOpen: !get().isOpen }),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      addItem: ({ product, variantId, variantLabel, variantPrice, variantImageUrl, quantity = 1, comment }) => {
        const cartKey = `${product.id}-${variantId ?? 'base'}`;
        const currentItems = get().items;
        const existing = currentItems.find((item) => item.cartKey === cartKey);

        if (existing) {
          set({
            items: currentItems.map((item) =>
              item.cartKey === cartKey
                ? { ...item, quantity: item.quantity + quantity, comment: comment ?? item.comment }
                : item
            ),
          });
        } else {
          const newItem: CartItem = {
            cartKey,
            id: product.id,
            variantId,
            name: product.name,
            variantLabel,
            price: variantPrice ?? product.price,
            imageUrl: variantImageUrl && variantImageUrl.trim() ? variantImageUrl : product.imageUrl,
            category: product.category,
            quantity,
            comment,
          };
          set({ items: [...currentItems, newItem] });
        }
      },
      removeItem: (cartKey) => {
        set({ items: get().items.filter((item) => item.cartKey !== cartKey) });
      },
      updateQuantity: (cartKey, quantity) => {
        if (quantity <= 0) {
          get().removeItem(cartKey);
          return;
        }
        set({
          items: get().items.map((item) =>
            item.cartKey === cartKey ? { ...item, quantity } : item
          ),
        });
      },
      clearCart: () => set({ items: [] }),
      get total() {
        return get().items.reduce(
          (sum, item) => sum + Number(item.price) * item.quantity,
          0
        );
      },
    }),
    {
      name: 'dulce-vida-cart',
    }
  )
);
