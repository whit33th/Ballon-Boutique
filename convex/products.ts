import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { internalMutation, mutation, query } from "./_generated/server";
import { requireUser } from "./helpers/auth";
import { attachImageToProduct } from "./helpers/products";
import { productWithImageValidator } from "./validators/product";

type ProductDoc = Doc<"products">;

const productPageValidator = v.object({
  page: v.array(productWithImageValidator),
  isDone: v.boolean(),
  continueCursor: v.string(),
});

const BALLOON_COLORS = [
  "Gold",
  "Rose Gold",
  "Silver",
  "Pink",
  "Hot Pink",
  "Blush",
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
];

const randomColors = (count: number) => {
  const shuffled = [...BALLOON_COLORS].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

type CategoryGroupValue =
  | "balloons"
  | "toy-in-balloon"
  | "balloon-bouquets"
  | "mini-sets";

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
  "toy in a balloon": {
    group: "toy-in-balloon",
    category: "Toy in a Balloon",
  },
  "surprise in a balloon": {
    group: "toy-in-balloon",
    category: "Toy in a Balloon",
  },
  "balloon bouquets": {
    group: "balloon-bouquets",
    category: "Balloon Bouquets",
  },
  "mini sets": { group: "mini-sets", category: "Mini Sets" },
  "mini gift sets": { group: "mini-sets", category: "Mini Sets" },
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
    normalized === "toy-in-balloon" ||
    normalized === "balloon-bouquets" ||
    normalized === "mini-sets"
  ) {
    return normalized as CategoryGroupValue;
  }

  return undefined;
};

const SAMPLE_PRODUCTS: Array<{
  name: string;
  description: string;
  price: number;
  categoryGroup: CategoryGroupValue;
  category: string;
  inStock: boolean;
  isPersonalizable?: boolean;
  availableColors?: string[];
}> = [
  {
    name: "Aurora Glow Balloon",
    description:
      "Soft gradient balloon that shifts from blush to sunrise gold.",
    price: 6,
    categoryGroup: "balloons",
    category: "For Kids Girls",
    inStock: true,
    isPersonalizable: true,
    availableColors: randomColors(4),
  },
  {
    name: "Sunrise Ombre Balloon",
    description: "Warm ombre tones that brighten morning celebrations.",
    price: 5.5,
    categoryGroup: "balloons",
    category: "For Her",
    inStock: true,
    isPersonalizable: true,
    availableColors: randomColors(4),
  },
  {
    name: "Electric Blue Balloon",
    description: "Vivid cobalt statement balloon for modern parties.",
    price: 4.5,
    categoryGroup: "balloons",
    category: "For Kids Boys",
    inStock: true,
    isPersonalizable: true,
    availableColors: randomColors(4),
  },
  {
    name: "Cotton Candy Swirl Balloon",
    description: "Pastel swirl pattern inspired by carnival treats.",
    price: 5,
    categoryGroup: "balloons",
    category: "For Kids Girls",
    inStock: true,
  },
  {
    name: "Midnight Spark Balloon",
    description: "Deep navy balloon with metallic specks that shimmer.",
    price: 7,
    categoryGroup: "balloons",
    category: "For Him",
    inStock: true,
  },
  {
    name: "Cherry Jubilee Balloon",
    description: "Rich cherry red balloon for bold centerpiece displays.",
    price: 4,
    categoryGroup: "balloons",
    category: "Anniversary",
    inStock: true,
  },
  {
    name: "Citrus Burst Balloon",
    description: "Zesty orange balloon that energizes summer events.",
    price: 3.5,
    categoryGroup: "balloons",
    category: "Any Event",
    inStock: true,
  },
  {
    name: "Ocean Breeze Balloon",
    description: "Cool teal balloon reminiscent of coastal escapes.",
    price: 4.5,
    categoryGroup: "balloons",
    category: "Baby Birth",
    inStock: true,
  },
  {
    name: "Lavender Dream Balloon",
    description: "Soft lavender tones perfect for bridal showers.",
    price: 5,
    categoryGroup: "balloons",
    category: "For Her",
    inStock: true,
  },
  {
    name: "Golden Celebration Balloon",
    description: "Luxe metallic gold balloon for milestone moments.",
    price: 8,
    categoryGroup: "balloons",
    category: "Anniversary",
    inStock: true,
    isPersonalizable: true,
    availableColors: randomColors(3),
  },
  {
    name: "Silver Lining Balloon",
    description: "Sleek silver balloon that complements modern decor.",
    price: 7.5,
    categoryGroup: "balloons",
    category: "Any Event",
    inStock: true,
    isPersonalizable: true,
    availableColors: randomColors(3),
  },
  {
    name: "Emerald Sparkle Balloon",
    description: "Jewel-toned balloon with subtle glitter overlay.",
    price: 6.5,
    categoryGroup: "balloon-bouquets",
    category: "For Her",
    inStock: true,
    isPersonalizable: true,
    availableColors: randomColors(3),
  },
  {
    name: "Rose Gold Luxe Balloon",
    description: "Trending rose gold balloon for chic gatherings.",
    price: 8.5,
    categoryGroup: "balloons",
    category: "For Her",
    inStock: true,
    isPersonalizable: true,
    availableColors: randomColors(4),
  },
  {
    name: "Iridescent Haze Balloon",
    description: "Opalescent finish that changes with every angle.",
    price: 9,
    categoryGroup: "toy-in-balloon",
    category: "Toy in a Balloon",
    inStock: true,
  },
  {
    name: "Frosted Pearl Balloon",
    description: "Frosted satin balloon with pearlescent sheen.",
    price: 5.5,
    categoryGroup: "balloons",
    category: "For Her",
    inStock: true,
  },
  {
    name: "Neon Carnival Balloon",
    description: "Vibrant neon palette designed for night parties.",
    price: 6,
    categoryGroup: "balloons",
    category: "For Kids Boys",
    inStock: true,
  },
  {
    name: "Starry Night Balloon",
    description: "Midnight blue balloon dotted with gold stars.",
    price: 7.5,
    categoryGroup: "balloons",
    category: "For Kids Boys",
    inStock: true,
  },
  {
    name: "Pastel Confetti Balloon",
    description: "Transparent balloon filled with pastel confetti.",
    price: 6.5,
    categoryGroup: "balloons",
    category: "Baby Birth",
    inStock: true,
  },
  {
    name: "Mystic Teal Balloon",
    description: "Moody teal balloon for enchanted themes.",
    price: 5.5,
    categoryGroup: "balloons",
    category: "Love",
    inStock: true,
  },
  {
    name: "Sunset Fiesta Balloon",
    description: "Fiery gradient balloon inspired by tropical sunsets.",
    price: 6.5,
    categoryGroup: "balloons",
    category: "Any Event",
    inStock: true,
  },
  {
    name: "Royal Purple Balloon",
    description: "Regal purple balloon suited for elegant soirees.",
    price: 6,
    categoryGroup: "balloons",
    category: "Anniversary",
    inStock: true,
  },
  {
    name: "Blush Bloom Balloon",
    description: "Delicate blush balloon with watercolor finish.",
    price: 5,
    categoryGroup: "balloons",
    category: "Mom",
    inStock: true,
  },
  {
    name: "Arctic Sky Balloon",
    description: "Cool gradient balloon shifting from ice blue to white.",
    price: 5.5,
    categoryGroup: "balloons",
    category: "Any Event",
    inStock: true,
  },
  {
    name: "Vintage Blush Balloon",
    description: "Muted rose balloon for nostalgic celebrations.",
    price: 4.5,
    categoryGroup: "balloons",
    category: "Love",
    inStock: true,
  },
  {
    name: "Galaxy Twist Balloon",
    description: "Cosmic balloon with swirling galaxy artwork.",
    price: 7,
    categoryGroup: "balloons",
    category: "For Kids Girls",
    inStock: true,
  },
  {
    name: "Tropical Sunrise Balloon",
    description: "Bright coral and yellow balloon for beach parties.",
    price: 5.5,
    categoryGroup: "balloons",
    category: "Any Event",
    inStock: true,
  },
  {
    name: "Velvet Rouge Balloon",
    description: "Deep wine balloon with luxe matte finish.",
    price: 6.5,
    categoryGroup: "balloons",
    category: "Love",
    inStock: true,
  },
  {
    name: "Crystal Clear Balloon",
    description: "Glass-like balloon ready for custom fillings.",
    price: 4,
    categoryGroup: "balloons",
    category: "Surprise Box",
    inStock: true,
  },
  {
    name: "Amber Spark Balloon",
    description: "Warm amber balloon with sparkling highlights.",
    price: 5.5,
    categoryGroup: "balloons",
    category: "Love",
    inStock: true,
  },
  {
    name: "Mint Breeze Balloon",
    description: "Fresh mint green balloon for spring events.",
    price: 4.5,
    categoryGroup: "mini-sets",
    category: "Mini Sets",
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
    const categoryGroup =
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

    // Step 1: Build query using indexes for categorical filters
    let allProducts: ProductDoc[];

    if (useSearch && searchTerm) {
      allProducts = await ctx.db
        .query("products")
        .withSearchIndex("search_products", (q) => q.search("name", searchTerm))
        .collect();
    } else if (categoryGroup && category) {
      allProducts = await ctx.db
        .query("products")
        .withIndex("by_group_and_category", (q) =>
          q.eq("categoryGroup", categoryGroup).eq("category", category),
        )
        .collect();
    } else if (category) {
      allProducts = await ctx.db
        .query("products")
        .withIndex("by_category", (q) => q.eq("category", category))
        .collect();
    } else if (categoryGroup) {
      allProducts = await ctx.db
        .query("products")
        .withIndex("by_category_group", (q) =>
          q.eq("categoryGroup", categoryGroup),
        )
        .collect();
    } else {
      allProducts = await ctx.db.query("products").collect();
    }

    // Step 2: Apply JavaScript filters for non-indexed fields
    const filtered = allProducts.filter((product) => {
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

    // Step 3: Apply sorting (only name-asc and name-desc)
    if (args.sort === "name-asc") {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    } else if (args.sort === "name-desc") {
      filtered.sort((a, b) => b.name.localeCompare(a.name));
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

export const create = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    price: v.number(),
    category: v.string(),
    categoryGroup: v.optional(v.string()),
    imageUrls: v.array(v.string()),
    inStock: v.boolean(),
    isPersonalizable: v.optional(v.boolean()),
    availableColors: v.optional(v.array(v.string())),
  },
  returns: v.id("products"),
  handler: async (ctx, args) => {
    await requireUser(ctx);

    if (args.price < 0) {
      throw new Error("Price must be non-negative");
    }

    const assignment = resolveCategoryAssignment(args.category);
    const providedGroup = normalizeCategoryGroupInput(args.categoryGroup);
    const categoryGroup = providedGroup ?? assignment.group;

    return ctx.db.insert("products", {
      name: args.name,
      description: args.description,
      price: args.price,
      categoryGroup,
      category: assignment.category,
      imageUrls: args.imageUrls,
      inStock: args.inStock,
      soldCount: 0,
      isPersonalizable: args.isPersonalizable ?? true,
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
    category: v.string(),
    categoryGroup: v.optional(v.string()),
    imageUrls: v.array(v.string()),
    inStock: v.boolean(),
    isPersonalizable: v.optional(v.boolean()),
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

    const assignment = resolveCategoryAssignment(args.category);
    const providedGroup = normalizeCategoryGroupInput(args.categoryGroup);
    const categoryGroup = providedGroup ?? assignment.group;

    await ctx.db.patch(args.productId, {
      name: args.name,
      description: args.description,
      price: args.price,
      category: assignment.category,
      categoryGroup,
      imageUrls: args.imageUrls,
      inStock: args.inStock,
      isPersonalizable: args.isPersonalizable ?? true,
      availableColors: args.availableColors,
    });

    return null;
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
          category: product.category,
          inStock: product.inStock,
          isPersonalizable: product.isPersonalizable ?? true,
          availableColors: product.availableColors,
        });
        updated += 1;
        continue;
      }

      await ctx.db.insert("products", {
        ...product,
        imageUrls: [],
        soldCount: 0,
        isPersonalizable: product.isPersonalizable ?? true,
      });
      inserted += 1;
    }

    return { inserted, updated };
  },
});
