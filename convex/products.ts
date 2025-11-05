import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
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

const BALLOON_SIZES = ["30cm", "45cm", "80cm", "100cm"] as const;
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

const randomSize = () =>
  BALLOON_SIZES[Math.floor(Math.random() * BALLOON_SIZES.length)];
const randomColors = (count: number) => {
  const shuffled = [...BALLOON_COLORS].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

const SAMPLE_PRODUCTS: Array<{
  name: string;
  description: string;
  price: number;
  category: string;
  size: "30cm" | "45cm" | "80cm" | "100cm";
  inStock: boolean;
  isPersonalizable?: boolean;
  availableColors?: string[];
}> = [
  {
    name: "Aurora Glow Balloon",
    description:
      "Soft gradient balloon that shifts from blush to sunrise gold.",
    price: 6,
    category: "For Kids",
    size: randomSize(),
    inStock: true,
    isPersonalizable: true,
    availableColors: randomColors(4),
  },
  {
    name: "Sunrise Ombre Balloon",
    description: "Warm ombre tones that brighten morning celebrations.",
    price: 5.5,
    category: "For Her",
    size: randomSize(),
    inStock: true,
    isPersonalizable: true,
    availableColors: randomColors(4),
  },
  {
    name: "Electric Blue Balloon",
    description: "Vivid cobalt statement balloon for modern parties.",
    price: 4.5,
    category: "For Kids",
    size: randomSize(),
    inStock: true,
    isPersonalizable: true,
    availableColors: randomColors(4),
  },
  {
    name: "Cotton Candy Swirl Balloon",
    description: "Pastel swirl pattern inspired by carnival treats.",
    price: 5,
    category: "For Kids",
    size: randomSize(),
    inStock: true,
  },
  {
    name: "Midnight Spark Balloon",
    description: "Deep navy balloon with metallic specks that shimmer.",
    price: 7,
    category: "For Him",
    size: randomSize(),
    inStock: true,
  },
  {
    name: "Cherry Jubilee Balloon",
    description: "Rich cherry red balloon for bold centerpiece displays.",
    price: 4,
    category: "Anniversary",
    size: randomSize(),
    inStock: true,
  },
  {
    name: "Citrus Burst Balloon",
    description: "Zesty orange balloon that energizes summer events.",
    price: 3.5,
    category: "For Kids",
    size: randomSize(),
    inStock: true,
  },
  {
    name: "Ocean Breeze Balloon",
    description: "Cool teal balloon reminiscent of coastal escapes.",
    price: 4.5,
    category: "Baby Birth",
    size: randomSize(),
    inStock: true,
  },
  {
    name: "Lavender Dream Balloon",
    description: "Soft lavender tones perfect for bridal showers.",
    price: 5,
    category: "For Her",
    size: randomSize(),
    inStock: true,
  },
  {
    name: "Golden Celebration Balloon",
    description: "Luxe metallic gold balloon for milestone moments.",
    price: 8,
    category: "Anniversary",
    size: randomSize(),
    inStock: true,
    isPersonalizable: true,
    availableColors: randomColors(3),
  },
  {
    name: "Silver Lining Balloon",
    description: "Sleek silver balloon that complements modern decor.",
    price: 7.5,
    category: "For Any Event",
    size: randomSize(),
    inStock: true,
    isPersonalizable: true,
    availableColors: randomColors(3),
  },
  {
    name: "Emerald Sparkle Balloon",
    description: "Jewel-toned balloon with subtle glitter overlay.",
    price: 6.5,
    category: "Balloon Bouquets",
    size: randomSize(),
    inStock: true,
    isPersonalizable: true,
    availableColors: randomColors(3),
  },
  {
    name: "Rose Gold Luxe Balloon",
    description: "Trending rose gold balloon for chic gatherings.",
    price: 8.5,
    category: "For Her",
    size: randomSize(),
    inStock: true,
    isPersonalizable: true,
    availableColors: randomColors(4),
  },
  {
    name: "Iridescent Haze Balloon",
    description: "Opalescent finish that changes with every angle.",
    price: 9,
    category: "Surprise in a Balloon",
    size: randomSize(),
    inStock: true,
  },
  {
    name: "Frosted Pearl Balloon",
    description: "Frosted satin balloon with pearlescent sheen.",
    price: 5.5,
    category: "For Her",
    size: randomSize(),
    inStock: true,
  },
  {
    name: "Neon Carnival Balloon",
    description: "Vibrant neon palette designed for night parties.",
    price: 6,
    category: "For Kids",
    size: randomSize(),
    inStock: true,
  },
  {
    name: "Starry Night Balloon",
    description: "Midnight blue balloon dotted with gold stars.",
    price: 7.5,
    category: "For Kids",
    size: randomSize(),
    inStock: true,
  },
  {
    name: "Pastel Confetti Balloon",
    description: "Transparent balloon filled with pastel confetti.",
    price: 6.5,
    category: "Baby Birth",
    size: randomSize(),
    inStock: true,
  },
  {
    name: "Mystic Teal Balloon",
    description: "Moody teal balloon for enchanted themes.",
    price: 5.5,
    category: "Love",
    size: randomSize(),
    inStock: true,
  },
  {
    name: "Sunset Fiesta Balloon",
    description: "Fiery gradient balloon inspired by tropical sunsets.",
    price: 6.5,
    category: "For Any Event",
    size: randomSize(),
    inStock: true,
  },
  {
    name: "Royal Purple Balloon",
    description: "Regal purple balloon suited for elegant soirees.",
    price: 6,
    category: "Anniversary",
    size: randomSize(),
    inStock: true,
  },
  {
    name: "Blush Bloom Balloon",
    description: "Delicate blush balloon with watercolor finish.",
    price: 5,
    category: "Baby Birth",
    size: randomSize(),
    inStock: true,
  },
  {
    name: "Arctic Sky Balloon",
    description: "Cool gradient balloon shifting from ice blue to white.",
    price: 5.5,
    category: "For Any Event",
    size: randomSize(),
    inStock: true,
  },
  {
    name: "Vintage Blush Balloon",
    description: "Muted rose balloon for nostalgic celebrations.",
    price: 4.5,
    category: "Anniversary",
    size: randomSize(),
    inStock: true,
  },
  {
    name: "Galaxy Twist Balloon",
    description: "Cosmic balloon with swirling galaxy artwork.",
    price: 7,
    category: "For Kids",
    size: randomSize(),
    inStock: true,
  },
  {
    name: "Tropical Sunrise Balloon",
    description: "Bright coral and yellow balloon for beach parties.",
    price: 5.5,
    category: "For Any Event",
    size: randomSize(),
    inStock: true,
  },
  {
    name: "Velvet Rouge Balloon",
    description: "Deep wine balloon with luxe matte finish.",
    price: 6.5,
    category: "Anniversary",
    size: randomSize(),
    inStock: true,
  },
  {
    name: "Crystal Clear Balloon",
    description: "Glass-like balloon ready for custom fillings.",
    price: 4,
    category: "Surprise in a Balloon",
    size: randomSize(),
    inStock: true,
  },
  {
    name: "Amber Spark Balloon",
    description: "Warm amber balloon with sparkling highlights.",
    price: 5.5,
    category: "Love",
    size: randomSize(),
    inStock: true,
  },
  {
    name: "Mint Breeze Balloon",
    description: "Fresh mint green balloon for spring events.",
    price: 4.5,
    category: "Baby Birth",
    size: randomSize(),
    inStock: true,
  },
];

export const list = query({
  args: {
    search: v.optional(v.string()),
    available: v.optional(v.boolean()),
    minPrice: v.optional(v.number()),
    maxPrice: v.optional(v.number()),
    category: v.optional(v.string()),
    color: v.optional(v.string()),
    size: v.optional(
      v.union(
        v.literal("30cm"),
        v.literal("45cm"),
        v.literal("80cm"),
        v.literal("100cm"),
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
    const normalizedSearch = args.search?.trim();
    const useSearch = normalizedSearch && normalizedSearch.length >= 2;
    const minPrice =
      typeof args.minPrice === "number" && Number.isFinite(args.minPrice)
        ? args.minPrice
        : undefined;
    const maxPrice =
      typeof args.maxPrice === "number" && Number.isFinite(args.maxPrice)
        ? args.maxPrice
        : undefined;
    const normalizeCategory = (input?: string | null) => {
      if (!input) {
        return undefined;
      }

      const replaced = input.replace(/\+/g, " ");
      const trimmed = replaced.trim();
      if (trimmed.length === 0) {
        return undefined;
      }

      try {
        const decoded = decodeURIComponent(trimmed);
        return decoded;
      } catch (_error) {
        return trimmed;
      }
    };

    const categoryInput = normalizeCategory(args.category);
    const categoryTerm = categoryInput?.toLowerCase();
    const colorInput = normalizeCategory(args.color);
    const colorTerm = colorInput?.toLowerCase();
    const sizeTerm = args.size;

    const getBaseQuery = () => {
      // Search takes priority
      if (useSearch && normalizedSearch) {
        return ctx.db
          .query("products")
          .withSearchIndex("search_products", (q) =>
            q.search("name", normalizedSearch),
          );
      }

      // Use optimized indexes for sorting
      if (args.sort === "price-low") {
        // Category + price index for better performance when filtering by category
        if (categoryInput) {
          return ctx.db
            .query("products")
            .withIndex("by_category_and_price", (q) =>
              q.eq("category", categoryInput),
            )
            .order("asc");
        }
        return ctx.db
          .query("products")
          .withIndex("by_price", (q) => q)
          .order("asc");
      }

      if (args.sort === "price-high") {
        if (categoryInput) {
          return ctx.db
            .query("products")
            .withIndex("by_category_and_price", (q) =>
              q.eq("category", categoryInput),
            )
            .order("desc");
        }
        return ctx.db
          .query("products")
          .withIndex("by_price", (q) => q)
          .order("desc");
      }

      if (args.sort === "name-asc") {
        return ctx.db
          .query("products")
          .withIndex("by_name", (q) => q)
          .order("asc");
      }

      if (args.sort === "name-desc") {
        return ctx.db
          .query("products")
          .withIndex("by_name", (q) => q)
          .order("desc");
      }

      // Default: show popular products first (bestsellers)
      // Use category-specific index if filtering by category
      if (categoryInput) {
        return ctx.db
          .query("products")
          .withIndex("by_category_and_popularity", (q) =>
            q.eq("category", categoryInput),
          )
          .order("desc");
      }

      // Default sorting: by popularity (soldCount desc)
      return ctx.db.query("products").withIndex("by_popularity").order("desc");
    };

    const matchesFilters = (product: ProductDoc) => {
      if (args.available && !product.inStock) {
        return false;
      }

      if (minPrice !== undefined && product.price < minPrice) {
        return false;
      }

      if (maxPrice !== undefined && product.price > maxPrice) {
        return false;
      }

      if (categoryTerm) {
        const productCategory = product.category?.trim();
        const productCategoryLower = productCategory?.toLowerCase();
        // Compare original category with the passed category (case-insensitive)
        if (productCategoryLower !== categoryTerm) {
          return false;
        }
      }

      if (colorTerm) {
        // Check if the product has the selected color in its availableColors array
        if (!product.availableColors || product.availableColors.length === 0) {
          return false;
        }
        const hasColor = product.availableColors.some(
          (color) => color.toLowerCase() === colorTerm,
        );
        if (!hasColor) {
          return false;
        }
      }

      if (sizeTerm && product.size !== sizeTerm) {
        return false;
      }

      return true;
    };

    const numItems = args.paginationOpts.numItems;
    const cursor = args.paginationOpts.cursor ?? null;

    // Without filters, simple pagination
    if (
      !args.available &&
      minPrice === undefined &&
      maxPrice === undefined &&
      !categoryTerm &&
      !colorTerm &&
      !sizeTerm
    ) {
      const { page, isDone, continueCursor } = await getBaseQuery().paginate({
        cursor,
        numItems,
      });

      const pageWithImages = await Promise.all(
        page.map((product) => attachImageToProduct(ctx, product)),
      );

      return {
        page: pageWithImages,
        isDone,
        continueCursor,
      };
    }

    // With filters, fetch a larger batch to account for filtering
    // We fetch more items to increase chances of having enough after filtering
    const batchSize = numItems * 10;
    const { page, isDone, continueCursor } = await getBaseQuery().paginate({
      cursor,
      numItems: batchSize,
    });

    const filtered = page.filter(matchesFilters);
    const pageForClient = filtered.slice(0, numItems);

    // Only indicate "has more" if we actually have more filtered items
    // or if the database query isn't done (there might be more matching items)
    const hasMoreFilteredItems = filtered.length > numItems;
    const databaseHasMore = !isDone;
    const hasMore =
      hasMoreFilteredItems || (databaseHasMore && filtered.length === numItems);

    if (!useSearch) {
      if (args.sort === "price-high") {
        pageForClient.sort((a, b) => b.price - a.price);
      } else if (args.sort === "price-low") {
        pageForClient.sort((a, b) => a.price - b.price);
      } else if (args.sort === "name-asc") {
        pageForClient.sort((a, b) => a.name.localeCompare(b.name));
      } else if (args.sort === "name-desc") {
        pageForClient.sort((a, b) => b.name.localeCompare(a.name));
      }
    }

    const pageWithImages = await Promise.all(
      pageForClient.map((product) => attachImageToProduct(ctx, product)),
    );

    const response = {
      page: pageWithImages,
      isDone: !hasMore,
      continueCursor: hasMore ? continueCursor : "",
    } satisfies {
      page: typeof pageWithImages;
      isDone: boolean;
      continueCursor: string;
    };

    return response;
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
    size: v.union(
      v.literal("30cm"),
      v.literal("45cm"),
      v.literal("80cm"),
      v.literal("100cm"),
    ),
    imageIds: v.array(v.id("_storage")),
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

    return ctx.db.insert("products", {
      ...args,
      soldCount: 0,
    });
  },
});

export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    await requireUser(ctx);
    return ctx.storage.generateUploadUrl();
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
          category: product.category,
          size: product.size,
          inStock: product.inStock,
          isPersonalizable: product.isPersonalizable,
          availableColors: product.availableColors,
        });
        updated += 1;
        continue;
      }

      await ctx.db.insert("products", {
        ...product,
        imageIds: [] as Array<Id<"_storage">>,
        soldCount: 0,
      });
      inserted += 1;
    }

    return { inserted, updated };
  },
});
