import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { type MutationCtx, mutation, query } from "./_generated/server";
import { requireUser } from "./helpers/auth";
import {
  attachImageToProduct,
  type ProductWithImage,
} from "./helpers/products";
import { productWithImageValidator } from "./validators/product";

type Personalization = {
  text?: string;
  color?: string;
  number?: string;
};

type Variant = {
  size: string;
  unitPrice: number;
};

type CartItemDoc = Doc<"cartItems">;

type CartItemResponse = {
  _id: Id<"cartItems">;
  _creationTime: number;
  userId: Id<"users">;
  productId: Id<"products">;
  quantity: number;
  personalization?: Personalization;
  variant?: Variant;
  personalizationSignature: string;
  product: ProductWithImage;
};

const cartItemResponseValidator = v.object({
  _id: v.id("cartItems"),
  _creationTime: v.number(),
  userId: v.id("users"),
  productId: v.id("products"),
  quantity: v.number(),
  personalization: v.optional(
    v.object({
      text: v.optional(v.string()),
      color: v.optional(v.string()),
      number: v.optional(v.string()),
    }),
  ),
  variant: v.optional(
    v.object({
      size: v.string(),
      unitPrice: v.number(),
    }),
  ),
  personalizationSignature: v.string(),
  product: productWithImageValidator,
});

const PERSONALIZATION_NONE = "__none__";

const normalizePersonalization = (
  personalization?: Personalization,
): Personalization | undefined => {
  if (!personalization) {
    return undefined;
  }

  const normalized: Personalization = {
    text: personalization.text?.trim() || undefined,
    color: personalization.color?.trim() || undefined,
    number: personalization.number?.trim() || undefined,
  };

  if (!normalized.text && !normalized.color && !normalized.number) {
    return undefined;
  }

  return normalized;
};

const buildPersonalizationSignature = (
  personalization?: Personalization,
  variant?: Variant,
): string => {
  if (!personalization && !variant) {
    return PERSONALIZATION_NONE;
  }

  // Backwards-compatible: keep the legacy shape when no variant is present.
  if (!variant) {
    return JSON.stringify({
      text: personalization?.text ?? null,
      color: personalization?.color ?? null,
      number: personalization?.number ?? null,
    });
  }

  return JSON.stringify({
    variant: {
      size: variant.size,
      unitPrice: variant.unitPrice,
    },
    text: personalization?.text ?? null,
    color: personalization?.color ?? null,
    number: personalization?.number ?? null,
  });
};

const isSamePersonalization = (
  a?: Personalization,
  b?: Personalization,
): boolean => {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return a.text === b.text && a.color === b.color && a.number === b.number;
};

const resolvePersonalizationSignature = (
  personalization: Personalization | undefined,
  variant: Variant | undefined,
  signature?: string,
) => {
  if (signature) {
    return signature;
  }
  return buildPersonalizationSignature(personalization, variant);
};

const normalizeVariantSize = (size?: string): string | undefined => {
  const trimmed = size?.trim();
  return trimmed ? trimmed : undefined;
};

const resolveVariantForProduct = (
  product: Doc<"products">,
  variantSize?: string,
): Variant | undefined => {
  const normalizedSize = normalizeVariantSize(variantSize);
  const sizes = (product.miniSetSizes ?? []) as Array<{
    label: string;
    price: number;
  }>;

  if (sizes.length === 0) {
    if (normalizedSize) {
      throw new Error("Variant size is not supported for this product");
    }
    return undefined;
  }

  if (!normalizedSize) {
    throw new Error("Please select a size for this mini-set");
  }

  const match = sizes.find(
    (entry) =>
      entry.label.trim().toLowerCase() === normalizedSize.toLowerCase(),
  );

  if (!match) {
    throw new Error("Selected size is not available");
  }

  return {
    size: match.label.trim(),
    unitPrice: match.price,
  };
};

const mergeDuplicateCartItems = async (
  ctx: MutationCtx,
  duplicates: CartItemDoc[],
): Promise<CartItemDoc> => {
  const [primary, ...rest] = duplicates;
  let mergedQuantity = primary.quantity;

  for (const dup of rest) {
    mergedQuantity += dup.quantity;
    await ctx.db.delete(dup._id);
  }

  await ctx.db.patch(primary._id, { quantity: mergedQuantity });
  const refreshed = await ctx.db.get(primary._id);
  if (!refreshed) {
    throw new Error("Failed to merge duplicate cart items");
  }
  return refreshed as CartItemDoc;
};

const findCartItemBySignature = async (
  ctx: MutationCtx,
  userId: Id<"users">,
  productId: Id<"products">,
  signature: string,
  personalization?: Personalization,
) => {
  const matches: CartItemDoc[] = [];
  const signatureQuery = ctx.db
    .query("cartItems")
    .withIndex("by_user_product_signature", (q) =>
      q
        .eq("userId", userId)
        .eq("productId", productId)
        .eq("personalizationSignature", signature),
    );

  for await (const item of signatureQuery) {
    matches.push(item as CartItemDoc);
    if (matches.length > 16) {
      break;
    }
  }

  if (matches.length === 1) {
    return matches[0];
  }

  if (matches.length > 1) {
    return mergeDuplicateCartItems(ctx, matches);
  }

  const legacyMatches: CartItemDoc[] = [];
  const legacyQuery = ctx.db
    .query("cartItems")
    .withIndex("by_user_and_product", (q) =>
      q.eq("userId", userId).eq("productId", productId),
    );

  for await (const item of legacyQuery) {
    const normalizedLegacy = normalizePersonalization(
      item.personalization as Personalization | undefined,
    );
    const legacySignature = resolvePersonalizationSignature(
      normalizedLegacy,
      undefined,
      item.personalizationSignature,
    );

    if (
      legacySignature === signature &&
      isSamePersonalization(normalizedLegacy, personalization)
    ) {
      legacyMatches.push(item as CartItemDoc);
      if (legacyMatches.length > 16) {
        break;
      }
    }
  }

  if (legacyMatches.length === 1) {
    return legacyMatches[0];
  }

  if (legacyMatches.length > 1) {
    return mergeDuplicateCartItems(ctx, legacyMatches);
  }

  return null;
};

const ensurePositiveInteger = (quantity: number) => {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error("Quantity must be a positive integer");
  }
};

const incrementCartItem = async (
  ctx: MutationCtx,
  userId: Id<"users">,
  productId: Id<"products">,
  delta: number,
  personalization?: Personalization,
  variantSize?: string,
) => {
  ensurePositiveInteger(delta);

  const product = await ctx.db.get(productId);
  if (!product) {
    throw new Error("Product not found");
  }

  const resolvedVariant = resolveVariantForProduct(
    product as Doc<"products">,
    variantSize,
  );

  const normalizedPersonalization = normalizePersonalization(personalization);
  const signature = buildPersonalizationSignature(
    normalizedPersonalization,
    resolvedVariant,
  );

  const existingItem = await findCartItemBySignature(
    ctx,
    userId,
    productId,
    signature,
    normalizedPersonalization,
  );

  if (!product.inStock) {
    throw new Error("Product is out of stock");
  }

  const newQuantity = (existingItem?.quantity ?? 0) + delta;

  if (existingItem) {
    await ctx.db.patch(existingItem._id, {
      quantity: newQuantity,
      personalization: normalizedPersonalization,
      variant: resolvedVariant,
      personalizationSignature: signature,
    });
  } else {
    await ctx.db.insert("cartItems", {
      userId,
      productId,
      quantity: newQuantity,
      personalization: normalizedPersonalization,
      variant: resolvedVariant,
      personalizationSignature: signature,
    });
  }
};

export const list = query({
  args: {},
  returns: v.array(cartItemResponseValidator),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    if (!(await ctx.db.get(userId))) {
      return [];
    }

    const items: CartItemResponse[] = [];
    const cartQuery = ctx.db
      .query("cartItems")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc");

    for await (const item of cartQuery) {
      const product = await ctx.db.get(item.productId);
      if (!product) {
        continue;
      }

      const normalizedPersonalization = normalizePersonalization(
        item.personalization as Personalization | undefined,
      );
      const productWithImage = await attachImageToProduct(ctx, product);
      items.push({
        ...item,
        personalization: normalizedPersonalization,
        personalizationSignature: resolvePersonalizationSignature(
          normalizedPersonalization,
          (item.variant as Variant | undefined) ?? undefined,
          item.personalizationSignature,
        ),
        product: productWithImage,
      });
    }

    return items;
  },
});

export const add = mutation({
  args: {
    productId: v.id("products"),
    quantity: v.number(),
    variant: v.optional(
      v.object({
        size: v.string(),
      }),
    ),
    personalization: v.optional(
      v.object({
        text: v.optional(v.string()),
        color: v.optional(v.string()),
        number: v.optional(v.string()),
      }),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx);
    await incrementCartItem(
      ctx,
      userId,
      args.productId,
      args.quantity,
      args.personalization,
      args.variant?.size,
    );
    return null;
  },
});

export const updateQuantity = mutation({
  args: {
    itemId: v.id("cartItems"),
    quantity: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx);

    const item = await ctx.db.get(args.itemId);
    if (!item || item.userId !== userId) {
      throw new Error("Item not found");
    }

    const product = await ctx.db.get(item.productId);
    if (!product) {
      throw new Error("Product not found");
    }

    if (!product.inStock) {
      throw new Error("Product is out of stock");
    }

    if (args.quantity <= 0) {
      await ctx.db.delete(args.itemId);
    } else {
      ensurePositiveInteger(args.quantity);
      await ctx.db.patch(args.itemId, { quantity: args.quantity });
    }

    return null;
  },
});

export const remove = mutation({
  args: { itemId: v.id("cartItems") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx);

    const item = await ctx.db.get(args.itemId);
    if (!item || item.userId !== userId) {
      throw new Error("Item not found");
    }

    await ctx.db.delete(args.itemId);
    return null;
  },
});

export const clear = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const { userId } = await requireUser(ctx);

    const cartQuery = ctx.db
      .query("cartItems")
      .withIndex("by_user", (q) => q.eq("userId", userId));

    for await (const item of cartQuery) {
      await ctx.db.delete(item._id);
    }

    return null;
  },
});

export const importGuestItems = mutation({
  args: {
    items: v.array(
      v.object({
        productId: v.id("products"),
        quantity: v.number(),
        variant: v.optional(
          v.object({
            size: v.string(),
          }),
        ),
        personalization: v.optional(
          v.object({
            text: v.optional(v.string()),
            color: v.optional(v.string()),
            number: v.optional(v.string()),
          }),
        ),
      }),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (args.items.length === 0) {
      return null;
    }

    const { userId } = await requireUser(ctx);

    for (const item of args.items) {
      if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
        continue;
      }

      await incrementCartItem(
        ctx,
        userId,
        item.productId,
        item.quantity,
        item.personalization as Personalization | undefined,
        item.variant?.size,
      );
    }

    return null;
  },
});

export const getTotal = query({
  args: {},
  returns: v.object({
    total: v.number(),
    itemCount: v.number(),
  }),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return { total: 0, itemCount: 0 };
    }

    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return { total: 0, itemCount: 0 };
    }

    if (!(await ctx.db.get(userId))) {
      return { total: 0, itemCount: 0 };
    }

    let total = 0;
    let itemCount = 0;

    const cartQuery = ctx.db
      .query("cartItems")
      .withIndex("by_user", (q) => q.eq("userId", userId));

    for await (const item of cartQuery) {
      const product = await ctx.db.get(item.productId);
      if (!product) {
        continue;
      }

      const unitPrice =
        (item.variant as Variant | undefined)?.unitPrice ?? product.price;
      total += unitPrice * item.quantity;
      itemCount += item.quantity;
    }

    return { total, itemCount };
  },
});
