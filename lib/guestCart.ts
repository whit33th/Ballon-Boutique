import { useCallback, useEffect, useState } from "react";
import type { Id } from "@/convex/_generated/dataModel";

export type GuestCartProductSnapshot = {
  productId: string;
  name: string;
  price: number;
  primaryImageUrl: string | null;
  inStock: boolean;
};

export type GuestCartItem = {
  productId: string;
  quantity: number;
  variant?: {
    size: string;
    unitPrice: number;
  };
  personalization?: {
    text?: string;
    color?: string;
    number?: string;
  };
  product: GuestCartProductSnapshot;
};

const STORAGE_KEY = "guest_cart_v1";
const EVENT_NAME = "guest-cart-changed";

const isBrowser = () => typeof window !== "undefined";

const readGuestCart = (): GuestCartItem[] => {
  if (!isBrowser()) {
    return [];
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((item): item is GuestCartItem => {
      const variant =
        typeof item === "object" && item !== null
          ? (item as { variant?: unknown }).variant
          : undefined;

      const hasValidVariant =
        variant === undefined ||
        (typeof variant === "object" &&
          variant !== null &&
          typeof (variant as { size?: unknown }).size === "string" &&
          typeof (variant as { unitPrice?: unknown }).unitPrice === "number");

      return (
        typeof item === "object" &&
        item !== null &&
        typeof item.productId === "string" &&
        typeof item.quantity === "number" &&
        hasValidVariant &&
        typeof item.product === "object" &&
        item.product !== null &&
        typeof item.product.name === "string" &&
        typeof item.product.price === "number"
      );
    });
  } catch {
    return [];
  }
};

const writeGuestCart = (items: GuestCartItem[]) => {
  if (!isBrowser()) {
    return;
  }

  console.log("Writing to guest cart:", items);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event(EVENT_NAME));
};

type ProductLike = {
  _id: string;
  name: string;
  price: number;
  primaryImageUrl?: string | null;
  inStock: boolean;
};

export const snapshotFromProduct = (
  product: ProductLike,
): GuestCartProductSnapshot => ({
  productId: product._id,
  name: product.name,
  price: product.price,
  primaryImageUrl: product.primaryImageUrl ?? null,
  inStock: product.inStock,
});

const isSamePersonalization = (
  a?: { text?: string; color?: string; number?: string },
  b?: { text?: string; color?: string; number?: string },
) => {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return a.text === b.text && a.color === b.color && a.number === b.number;
};

const isSameVariant = (
  a?: { size: string; unitPrice: number },
  b?: { size: string; unitPrice: number },
) => {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return a.size === b.size;
};

export const addGuestCartItem = (
  snapshot: GuestCartProductSnapshot,
  quantity: number,
  variant?: {
    size: string;
    unitPrice: number;
  },
  personalization?: {
    text?: string;
    color?: string;
    number?: string;
  },
) => {
  console.log("🔵 addGuestCartItem called with:", {
    productId: snapshot.productId,
    quantity,
    variant,
    personalization,
  });

  if (quantity <= 0 || !Number.isFinite(quantity)) {
    return;
  }

  const cart = readGuestCart();
  // Find item with same product AND same personalization
  const existing = cart.find(
    (item) =>
      item.productId === snapshot.productId &&
      isSameVariant(item.variant, variant) &&
      isSamePersonalization(item.personalization, personalization),
  );

  console.log("🟢 existing item found:", existing);

  if (existing) {
    const desired = existing.quantity + quantity;
    existing.quantity = Math.max(1, Math.floor(desired));
    existing.product = snapshot;
    existing.variant = variant;
    console.log("🟡 Updated existing item quantity to:", existing.quantity);
  } else {
    const newItem = {
      productId: snapshot.productId,
      quantity: Math.max(1, Math.floor(quantity)),
      variant,
      personalization,
      product: snapshot,
    };
    cart.push(newItem);
    console.log("🟣 Added new item:", newItem);
  }

  writeGuestCart(cart);
};

export const setGuestCartQuantity = (index: number, quantity: number) => {
  const cart = readGuestCart();

  if (index < 0 || index >= cart.length) {
    return;
  }

  if (quantity <= 0 || !Number.isFinite(quantity)) {
    // Remove item if quantity is 0 or invalid
    const updated = cart.filter((_, i) => i !== index);
    writeGuestCart(updated);
    return;
  }

  const clamped = Math.max(1, Math.floor(quantity));
  const updated = cart.map((item, i) =>
    i === index ? { ...item, quantity: clamped } : item,
  );

  writeGuestCart(updated);
};

export const removeGuestCartItem = (index: number) => {
  const cart = readGuestCart();

  if (index < 0 || index >= cart.length) {
    return;
  }

  const updated = cart.filter((_, i) => i !== index);
  writeGuestCart(updated);
};

export const clearGuestCart = () => {
  writeGuestCart([]);
};

export const useGuestCart = () => {
  const [items, setItems] = useState<GuestCartItem[]>([]);
  const [initialized, setInitialized] = useState(false);

  const refresh = useCallback(() => {
    setItems(readGuestCart());
    setInitialized(true);
  }, []);

  useEffect(() => {
    if (!isBrowser()) {
      return;
    }

    refresh();

    const handler = () => refresh();
    window.addEventListener(EVENT_NAME, handler);
    window.addEventListener("storage", handler);

    return () => {
      window.removeEventListener(EVENT_NAME, handler);
      window.removeEventListener("storage", handler);
    };
  }, [refresh]);

  const addItem = useCallback(
    (
      snapshot: GuestCartProductSnapshot,
      quantity: number,
      variant?: {
        size: string;
        unitPrice: number;
      },
      personalization?: {
        text?: string;
        color?: string;
        number?: string;
      },
    ) => {
      addGuestCartItem(snapshot, quantity, variant, personalization);
    },
    [],
  );

  const setQuantity = useCallback((index: number, quantity: number) => {
    setGuestCartQuantity(index, quantity);
  }, []);

  const removeItem = useCallback((index: number) => {
    removeGuestCartItem(index);
  }, []);

  const clear = useCallback(() => {
    clearGuestCart();
  }, []);

  const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce(
    (sum, item) =>
      sum + item.quantity * (item.variant?.unitPrice ?? item.product.price),
    0,
  );

  return {
    items,
    initialized,
    totalCount,
    totalPrice,
    addItem,
    setQuantity,
    removeItem,
    clear,
  };
};

export const mapGuestCartForImport = (items: GuestCartItem[]) =>
  items.map((item) => ({
    productId: item.productId as Id<"products">,
    quantity: item.quantity,
    variant: item.variant?.size ? { size: item.variant.size } : undefined,
    personalization: item.personalization,
  }));
