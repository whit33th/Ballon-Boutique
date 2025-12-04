import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { internalMutation, mutation, query } from "./_generated/server";
import { requireUser } from "./helpers/auth";
import {
  attachImageToProduct,
  getProductCategories,
  type ProductWithImage,
} from "./helpers/products";
import { productWithImageValidator } from "./validators/product";

type ProductDoc = Doc<"products">;

const ORDER_OPTIONS = [
  "createdAt-desc",
  "createdAt-asc",
  "orderCount-desc",
  "orderCount-asc",
  "price-desc",
  "price-asc",
] as const;

type OrderOption = (typeof ORDER_OPTIONS)[number];

const DEFAULT_ORDER: OrderOption = "createdAt-desc";

const resolveOrderDirection = (order: OrderOption): "asc" | "desc" =>
  order.endsWith("desc") ? "desc" : "asc";

const isPopularityOrder = (order: OrderOption): boolean =>
  order.startsWith("orderCount");

const isPriceOrder = (order: OrderOption): boolean => order.startsWith("price");

const compareByOrder = (
  order: OrderOption,
  a: ProductDoc,
  b: ProductDoc,
): number => {
  const direction = order.endsWith("desc") ? -1 : 1;

  if (isPopularityOrder(order)) {
    const diff = ((a.soldCount ?? 0) - (b.soldCount ?? 0)) * direction;
    if (diff !== 0) {
      return diff;
    }
    return b._creationTime - a._creationTime;
  }

  if (isPriceOrder(order)) {
    const diff = (a.price - b.price) * direction;
    if (diff !== 0) {
      return diff;
    }
    return b._creationTime - a._creationTime;
  }

  return (a._creationTime - b._creationTime) * direction;
};

const productPageValidator = v.object({
  page: v.array(productWithImageValidator),
  isDone: v.boolean(),
  continueCursor: v.string(),
});

/**
 * IMPORTANT: This list must exactly match the colors in constants/colors.ts
 * That file is the single source of truth for balloon colors.
 * If you add/remove colors here, update constants/colors.ts as well.
 */
const BALLOON_COLORS = [
  "Gold",
  "Rose Gold",
  "Silver",
  "Pink",
  "Hot Pink",
  "Blue",
  "Light Blue",
  "Navy",
  "Red",
  "White",
  "Black",
  "Purple",
  "Lavender",
  "Green",
  "Mint",
  "Yellow",
  "Orange",
  "Peach",
  "Coral",
  "Teal",
  "Turquoise",
  "Champagne",
  "Burgundy",
  "Emerald",
  "Mix",
];

const randomColors = (count: number) => {
  const shuffled = [...BALLOON_COLORS].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

type CategoryGroupValue = "balloons" | "balloon-bouquets" | "mini-sets";

const CATEGORY_GROUP_MAP: Record<
  string,
  { group: CategoryGroupValue; category: string }
> = {
  "for kids": { group: "balloons", category: "For Kids Boys" },
  "for kids boys": { group: "balloons", category: "For Kids Boys" },
  "for kids girls": { group: "balloons", category: "For Kids Girls" },
  "for her": { group: "balloons", category: "For Her" },
  "for him": { group: "balloons", category: "For Him" },
  love: { group: "balloons", category: "Love" },
  mom: { group: "balloons", category: "Mom" },
  anniversary: { group: "balloons", category: "Anniversary" },
  "baby birth": { group: "balloons", category: "Baby Birth" },
  "surprise box": { group: "balloons", category: "Surprise Box" },
  "for any event": { group: "balloons", category: "Any Event" },
  "any event": { group: "balloons", category: "Any Event" },
  "balloon bouquets": {
    group: "balloon-bouquets",
    category: "Balloon Bouquets",
  },
  "mini sets": { group: "mini-sets", category: "Mini Sets" },
  "mini gift sets": { group: "mini-sets", category: "Mini Sets" },
};

const GROUP_DEFAULT_CATEGORY: Record<CategoryGroupValue, string> = {
  balloons: "Any Event",
  "balloon-bouquets": "Balloon Bouquets",
  "mini-sets": "Mini Sets",
};

const resolveCategoryAssignment = (
  rawCategory?: string | null,
): { group: CategoryGroupValue; category: string } => {
  if (!rawCategory) {
    return { group: "balloons", category: "Any Event" };
  }

  const normalized = rawCategory.trim().toLowerCase();
  if (normalized.length === 0) {
    return { group: "balloons", category: "Any Event" };
  }

  const mapping = CATEGORY_GROUP_MAP[normalized];
  if (mapping) {
    return mapping;
  }

  return { group: "balloons", category: rawCategory.trim() };
};

const normalizeCategoryGroupInput = (
  rawGroup?: string | null,
): CategoryGroupValue | undefined => {
  if (!rawGroup) {
    return undefined;
  }

  const normalized = rawGroup.trim().toLowerCase();
  if (
    normalized === "balloons" ||
    normalized === "balloon-bouquets" ||
    normalized === "mini-sets"
  ) {
    return normalized as CategoryGroupValue;
  }

  return undefined;
};

const sanitizeCategoriesSelection = (
  rawCategories: ReadonlyArray<string> | undefined,
  rawGroup?: string | null,
): { categoryGroup: CategoryGroupValue; categories: string[] } => {
  const providedGroup = normalizeCategoryGroupInput(rawGroup);
  const canonicalCategories: string[] = [];
  let resolvedGroup = providedGroup;

  for (const candidate of rawCategories ?? []) {
    if (!candidate) {
      continue;
    }
    const trimmed = candidate.trim();
    if (!trimmed) {
      continue;
    }

    // When a categoryGroup is explicitly provided, trust it and just use the
    // category label as-is. Only infer the group from the category name if
    // no explicit group was given.
    if (providedGroup) {
      if (!canonicalCategories.includes(trimmed)) {
        canonicalCategories.push(trimmed);
      }
    } else {
      const assignment = resolveCategoryAssignment(trimmed);
      if (resolvedGroup && assignment.group !== resolvedGroup) {
        throw new Error(
          "All selected categories must belong to the same category group",
        );
      }
      resolvedGroup = resolvedGroup ?? assignment.group;
      if (!canonicalCategories.includes(assignment.category)) {
        canonicalCategories.push(assignment.category);
      }
    }
  }

  const categoryGroup = resolvedGroup ?? "balloons";
  if (canonicalCategories.length === 0) {
    canonicalCategories.push(GROUP_DEFAULT_CATEGORY[categoryGroup]);
  }

  return {
    categoryGroup,
    categories: canonicalCategories,
  };
};

const SAMPLE_PRODUCTS: Array<{
  name: string;
  description: string;
  price: number;
  categoryGroup: CategoryGroupValue;
  categories: string[];
  inStock: boolean;
  isPersonalizable?: { name: boolean; number: boolean };
  availableColors?: string[];
}> = [
    {
      name: "Aurora Glow Balloon",
      description:
        "Soft gradient balloon that shifts from blush to sunrise gold.",
      price: 6,
      categoryGroup: "balloons",
      categories: ["For Kids Girls", "For Her"],
      inStock: true,
      isPersonalizable: { name: true, number: true },
      availableColors: randomColors(4),
    },
    {
      name: "Sunrise Ombre Balloon",
      description: "Warm ombre tones that brighten morning celebrations.",
      price: 5.5,
      categoryGroup: "balloons",
      categories: ["For Her", "Anniversary"],
      inStock: true,
      isPersonalizable: { name: true, number: true },
      availableColors: randomColors(4),
    },
    {
      name: "Electric Blue Balloon",
      description: "Vivid cobalt statement balloon for modern parties.",
      price: 4.5,
      categoryGroup: "balloons",
      categories: ["For Kids Boys", "Any Event"],
      inStock: true,
      isPersonalizable: { name: true, number: true },
      availableColors: randomColors(4),
    },
    {
      name: "Cotton Candy Swirl Balloon",
      description: "Pastel swirl pattern inspired by carnival treats.",
      price: 5,
      categoryGroup: "balloons",
      categories: ["For Kids Girls"],
      inStock: true,
    },
    {
      name: "Midnight Spark Balloon",
      description: "Deep navy balloon with metallic specks that shimmer.",
      price: 7,
      categoryGroup: "balloons",
      categories: ["For Him"],
      inStock: true,
    },
    {
      name: "Cherry Jubilee Balloon",
      description: "Rich cherry red balloon for bold centerpiece displays.",
      price: 4,
      categoryGroup: "balloons",
      categories: ["Anniversary"],
      inStock: true,
    },
    {
      name: "Citrus Burst Balloon",
      description: "Zesty orange balloon that energizes summer events.",
      price: 3.5,
      categoryGroup: "balloons",
      categories: ["Any Event"],
      inStock: true,
    },
    {
      name: "Ocean Breeze Balloon",
      description: "Cool teal balloon reminiscent of coastal escapes.",
      price: 4.5,
      categoryGroup: "balloons",
      categories: ["Baby Birth"],
      inStock: true,
    },
    {
      name: "Lavender Dream Balloon",
      description: "Soft lavender tones perfect for bridal showers.",
      price: 5,
      categoryGroup: "balloons",
      categories: ["For Her"],
      inStock: true,
    },
    {
      name: "Golden Celebration Balloon",
      description: "Luxe metallic gold balloon for milestone moments.",
      price: 8,
      categoryGroup: "balloons",
      categories: ["Anniversary", "Love"],
      inStock: true,
      isPersonalizable: { name: true, number: true },
      availableColors: randomColors(3),
    },
    {
      name: "Silver Lining Balloon",
      description: "Sleek silver balloon that complements modern decor.",
      price: 7.5,
      categoryGroup: "balloons",
      categories: ["Any Event"],
      inStock: true,
      isPersonalizable: { name: true, number: true },
      availableColors: randomColors(3),
    },
    {
      name: "Emerald Sparkle Balloon",
      description: "Jewel-toned balloon with subtle glitter overlay.",
      price: 6.5,
      categoryGroup: "balloon-bouquets",
      categories: ["For Her"],
      inStock: true,
      isPersonalizable: { name: true, number: true },
      availableColors: randomColors(3),
    },
    {
      name: "Rose Gold Luxe Balloon",
      description: "Trending rose gold balloon for chic gatherings.",
      price: 8.5,
      categoryGroup: "balloons",
      categories: ["For Her"],
      inStock: true,
      isPersonalizable: { name: true, number: true },
      availableColors: randomColors(4),
    },
    {
      name: "Frosted Pearl Balloon",
      description: "Frosted satin balloon with pearlescent sheen.",
      price: 5.5,
      categoryGroup: "balloons",
      categories: ["For Her"],
      inStock: true,
    },
    {
      name: "Neon Carnival Balloon",
      description: "Vibrant neon palette designed for night parties.",
      price: 6,
      categoryGroup: "balloons",
      categories: ["For Kids Boys"],
      inStock: true,
    },
    {
      name: "Starry Night Balloon",
      description: "Midnight blue balloon dotted with gold stars.",
      price: 7.5,
      categoryGroup: "balloons",
      categories: ["For Kids Boys"],
      inStock: true,
    },
    {
      name: "Pastel Confetti Balloon",
      description: "Transparent balloon filled with pastel confetti.",
      price: 6.5,
      categoryGroup: "balloons",
      categories: ["Baby Birth"],
      inStock: true,
    },
    {
      name: "Mystic Teal Balloon",
      description: "Moody teal balloon for enchanted themes.",
      price: 5.5,
      categoryGroup: "balloons",
      categories: ["Love"],
      inStock: true,
    },
    {
      name: "Sunset Fiesta Balloon",
      description: "Fiery gradient balloon inspired by tropical sunsets.",
      price: 6.5,
      categoryGroup: "balloons",
      categories: ["Any Event"],
      inStock: true,
    },
    {
      name: "Royal Purple Balloon",
      description: "Regal purple balloon suited for elegant soirees.",
      price: 6,
      categoryGroup: "balloons",
      categories: ["Anniversary"],
      inStock: true,
    },
    {
      name: "Blush Bloom Balloon",
      description: "Delicate blush balloon with watercolor finish.",
      price: 5,
      categoryGroup: "balloons",
      categories: ["Mom"],
      inStock: true,
    },
    {
      name: "Arctic Sky Balloon",
      description: "Cool gradient balloon shifting from ice blue to white.",
      price: 5.5,
      categoryGroup: "balloons",
      categories: ["Any Event"],
      inStock: true,
    },
    {
      name: "Vintage Blush Balloon",
      description: "Muted rose balloon for nostalgic celebrations.",
      price: 4.5,
      categoryGroup: "balloons",
      categories: ["Love"],
      inStock: true,
    },
    {
      name: "Galaxy Twist Balloon",
      description: "Cosmic balloon with swirling galaxy artwork.",
      price: 7,
      categoryGroup: "balloons",
      categories: ["For Kids Girls"],
      inStock: true,
    },
    {
      name: "Tropical Sunrise Balloon",
      description: "Bright coral and yellow balloon for beach parties.",
      price: 5.5,
      categoryGroup: "balloons",
      categories: ["Any Event", "Surprise Box"],
      inStock: true,
    },
    {
      name: "Velvet Rouge Balloon",
      description: "Deep wine balloon with luxe matte finish.",
      price: 6.5,
      categoryGroup: "balloons",
      categories: ["Love"],
      inStock: true,
    },
    {
      name: "Crystal Clear Balloon",
      description: "Glass-like balloon ready for custom fillings.",
      price: 4,
      categoryGroup: "balloons",
      categories: ["Surprise Box"],
      inStock: true,
    },
    {
      name: "Amber Spark Balloon",
      description: "Warm amber balloon with sparkling highlights.",
      price: 5.5,
      categoryGroup: "balloons",
      categories: ["Love"],
      inStock: true,
    },
    {
      name: "Mint Breeze Balloon",
      description: "Fresh mint green balloon for spring events.",
      price: 4.5,
      categoryGroup: "mini-sets",
      categories: ["Mini Sets"],
      inStock: true,
    },
  ];

export const getNewProducts = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  returns: productPageValidator,
  handler: async (ctx, args) => {
    // Use creation time ordering (newest first) — leverages underlying index
    const allProducts = await ctx.db.query("products").order("desc").collect();

    // Paginate
    const baseCursor = args.paginationOpts.cursor
      ? Number.parseInt(args.paginationOpts.cursor, 10)
      : 0;
    const cursor = baseCursor;
    const numItems = args.paginationOpts.numItems;
    const startIdx = cursor;
    const endIdx = startIdx + numItems;
    const page = allProducts.slice(startIdx, endIdx);
    const hasMore = endIdx < allProducts.length;

    // Attach images
    const pageWithImages = await Promise.all(
      page.map((product) => attachImageToProduct(ctx, product)),
    );

    return {
      page: pageWithImages,
      isDone: !hasMore,
      continueCursor: hasMore ? endIdx.toString() : "",
    };
  },
});

export const list = query({
  args: {
    search: v.optional(v.string()),
    available: v.optional(v.boolean()),
    minPrice: v.optional(v.number()),
    maxPrice: v.optional(v.number()),
    category: v.optional(v.string()),
    categoryGroup: v.optional(v.string()),
    color: v.optional(v.string()),
    order: v.optional(
      v.union(
        v.literal("createdAt-desc"),
        v.literal("createdAt-asc"),
        v.literal("orderCount-desc"),
        v.literal("orderCount-asc"),
        v.literal("price-desc"),
        v.literal("price-asc"),
      ),
    ),
    sort: v.optional(
      v.union(
        v.literal("price-low"),
        v.literal("price-high"),
        v.literal("name-asc"),
        v.literal("name-desc"),
        v.literal("default"),
      ),
    ),
    paginationOpts: paginationOptsValidator,
  },
  returns: productPageValidator,
  handler: async (ctx, args) => {
    // Normalize inputs
    const normalizeString = (input?: string | null) => {
      if (!input) return undefined;
      const trimmed = input.replace(/\+/g, " ").trim();
      if (!trimmed) return undefined;
      try {
        return decodeURIComponent(trimmed);
      } catch {
        return trimmed;
      }
    };

    const searchTerm = args.search?.trim();
    const useSearch = searchTerm && searchTerm.length >= 2;

    const categoryInput = normalizeString(args.category);
    const categoryNorm = categoryInput
      ? resolveCategoryAssignment(categoryInput)
      : undefined;
    const category = categoryNorm?.category ?? categoryInput;
    const categoryGroupInput =
      normalizeString(args.categoryGroup) ?? categoryNorm?.group;
    const color = normalizeString(args.color);
    const available = args.available;
    const minPrice =
      typeof args.minPrice === "number" && Number.isFinite(args.minPrice)
        ? args.minPrice
        : undefined;
    const maxPrice =
      typeof args.maxPrice === "number" && Number.isFinite(args.maxPrice)
        ? args.maxPrice
        : undefined;
    const order: OrderOption = args.order ?? DEFAULT_ORDER;
    const orderDirection = resolveOrderDirection(order);
    const popularityOrder = isPopularityOrder(order);
    const priceOrder = isPriceOrder(order);

    // Step 1: Build query using indexes for categorical filters
    let allProducts: ProductDoc[];

    if (useSearch && searchTerm) {
      allProducts = await ctx.db
        .query("products")
        .withSearchIndex("search_products", (q) => q.search("name", searchTerm))
        .collect();
    } else if (categoryGroupInput) {
      if (popularityOrder) {
        allProducts = await ctx.db
          .query("products")
          .withIndex("by_group_and_popularity", (q) =>
            q.eq("categoryGroup", categoryGroupInput),
          )
          .order(orderDirection)
          .collect();
      } else if (priceOrder) {
        allProducts = await ctx.db
          .query("products")
          .withIndex("by_group_and_price", (q) =>
            q.eq("categoryGroup", categoryGroupInput),
          )
          .order(orderDirection)
          .collect();
      } else {
        allProducts = await ctx.db
          .query("products")
          .withIndex("by_category_group", (q) =>
            q.eq("categoryGroup", categoryGroupInput),
          )
          .order(orderDirection)
          .collect();
      }
    } else {
      if (popularityOrder) {
        allProducts = await ctx.db
          .query("products")
          .withIndex("by_popularity")
          .order(orderDirection)
          .collect();
      } else if (priceOrder) {
        allProducts = await ctx.db
          .query("products")
          .withIndex("by_price")
          .order(orderDirection)
          .collect();
      } else {
        allProducts = await ctx.db
          .query("products")
          .order(orderDirection)
          .collect();
      }
    }

    // Step 2: Apply JavaScript filters for non-indexed fields
    const filtered = allProducts.filter((product) => {
      if (category) {
        const categories = getProductCategories(product);
        const hasCategory = categories.some((value) => value === category);
        if (!hasCategory) {
          return false;
        }
      }
      if (available && !product.inStock) return false;
      if (minPrice !== undefined && product.price < minPrice) return false;
      if (maxPrice !== undefined && product.price > maxPrice) return false;
      if (color) {
        const hasColor = product.availableColors?.some(
          (c) => c.toLowerCase() === color.toLowerCase(),
        );
        if (!hasColor) return false;
      }
      return true;
    });

    // Step 3: Apply sorting
    if (args.sort === "name-asc") {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    } else if (args.sort === "name-desc") {
      filtered.sort((a, b) => b.name.localeCompare(a.name));
    } else if (args.sort === "price-low") {
      filtered.sort((a, b) => a.price - b.price);
    } else if (args.sort === "price-high") {
      filtered.sort((a, b) => b.price - a.price);
    } else {
      filtered.sort((a, b) => compareByOrder(order, a, b));
    }

    // Step 4: Paginate on server
    const cursor = args.paginationOpts.cursor
      ? Number.parseInt(args.paginationOpts.cursor, 10)
      : 0;
    const numItems = args.paginationOpts.numItems;
    const startIdx = cursor;
    const endIdx = startIdx + numItems;
    const page = filtered.slice(startIdx, endIdx);
    const hasMore = endIdx < filtered.length;

    // Step 5: Attach images and return
    const pageWithImages = await Promise.all(
      page.map((product) => attachImageToProduct(ctx, product)),
    );

    return {
      page: pageWithImages,
      isDone: !hasMore,
      continueCursor: hasMore ? endIdx.toString() : "",
    };
  },
});

export const get = query({
  args: { id: v.id("products") },
  returns: v.union(productWithImageValidator, v.null()),
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.id);
    if (!product) {
      return null;
    }

    return attachImageToProduct(ctx, product);
  },
});

export const getMany = query({
  args: { ids: v.array(v.id("products")) },
  returns: v.array(productWithImageValidator),
  handler: async (ctx, args) => {
    const results: ProductWithImage[] = [];
    for (const id of args.ids) {
      const product = await ctx.db.get(id);
      if (!product) continue;
      const p = await attachImageToProduct(ctx, product);
      results.push(p);
    }
    return results;
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    price: v.number(),
    categories: v.array(v.string()),
    categoryGroup: v.optional(v.string()),
    imageUrls: v.array(v.string()),
    inStock: v.boolean(),
    isPersonalizable: v.optional(
      v.object({
        name: v.boolean(),
        number: v.boolean(),
      }),
    ),
    availableColors: v.optional(v.array(v.string())),
  },
  returns: v.id("products"),
  handler: async (ctx, args) => {
    await requireUser(ctx);

    if (args.price < 0) {
      throw new Error("Price must be non-negative");
    }

    const { categoryGroup, categories } = sanitizeCategoriesSelection(
      args.categories,
      args.categoryGroup,
    );

    return ctx.db.insert("products", {
      name: args.name,
      description: args.description,
      price: args.price,
      categoryGroup,
      categories,
      imageUrls: args.imageUrls,
      inStock: args.inStock,
      soldCount: 0,
      isPersonalizable: args.isPersonalizable ?? { name: false, number: false },
      availableColors: args.availableColors,
    });
  },
});

export const update = mutation({
  args: {
    productId: v.id("products"),
    name: v.string(),
    description: v.string(),
    price: v.number(),
    categories: v.array(v.string()),
    categoryGroup: v.optional(v.string()),
    imageUrls: v.array(v.string()),
    inStock: v.boolean(),
    isPersonalizable: v.optional(
      v.object({
        name: v.boolean(),
        number: v.boolean(),
      }),
    ),
    availableColors: v.optional(v.array(v.string())),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireUser(ctx);

    const existing = await ctx.db.get(args.productId);
    if (!existing) {
      throw new Error("Product not found");
    }

    if (args.price < 0) {
      throw new Error("Price must be non-negative");
    }

    const { categoryGroup, categories } = sanitizeCategoriesSelection(
      args.categories,
      args.categoryGroup,
    );

    await ctx.db.patch(args.productId, {
      name: args.name,
      description: args.description,
      price: args.price,
      categories,
      categoryGroup,
      imageUrls: args.imageUrls,
      inStock: args.inStock,
      isPersonalizable: args.isPersonalizable ?? { name: false, number: false },
      availableColors: args.availableColors,
    });

    return null;
  },
});

export const remove = mutation({
  args: {
    productId: v.id("products"),
  },
  returns: v.object({
    deletedId: v.id("products"),
    deletedImageUrls: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    await requireUser(ctx);

    const existing = await ctx.db.get(args.productId);
    if (!existing) {
      throw new Error("Product not found");
    }

    await ctx.db.delete(args.productId);

    return {
      deletedId: args.productId,
      deletedImageUrls: existing.imageUrls ?? [],
    };
  },
});

export const clearAllProducts = internalMutation({
  args: {},
  returns: v.object({
    deleted: v.number(),
  }),
  handler: async (ctx) => {
    const allProducts = await ctx.db.query("products").collect();
    let deleted = 0;

    for (const product of allProducts) {
      await ctx.db.delete(product._id);
      deleted += 1;
    }

    return { deleted };
  },
});

export const seedSampleProducts = internalMutation({
  args: {},
  returns: v.object({
    inserted: v.number(),
    updated: v.number(),
  }),
  handler: async (ctx) => {
    let inserted = 0;
    let updated = 0;

    for (const product of SAMPLE_PRODUCTS) {
      const existing = await ctx.db
        .query("products")
        .withIndex("by_name", (q) => q.eq("name", product.name))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          description: product.description,
          price: product.price,
          categoryGroup: product.categoryGroup,
          categories: product.categories,
          inStock: product.inStock,
          isPersonalizable: product.isPersonalizable ?? {
            name: false,
            number: false,
          },
          availableColors: product.availableColors,
        });
        updated += 1;
        continue;
      }

      await ctx.db.insert("products", {
        ...product,
        imageUrls: [],
        soldCount: 0,
        isPersonalizable: product.isPersonalizable ?? {
          name: false,
          number: false,
        },
      });
      inserted += 1;
    }

    return { inserted, updated };
  },
});
