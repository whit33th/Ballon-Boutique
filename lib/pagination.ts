/**
 * Grid configuration matching Tailwind CSS breakpoints
 * Based on the grid layout:
 * - Mobile (< 640px): 2 columns
 * - Small (640px - 1536px): auto-fill with minmax(240px, 1fr)
 * - 2XL (>= 1536px): auto-fill with minmax(280px, 1fr)
 */
export const GRID_CONFIG = {
  mobile: {
    breakpoint: 0,
    columns: 2,
    minItemWidth: 0, // Not used for mobile
  },
  sm: {
    breakpoint: 640,
    columns: null, // auto-fill
    minItemWidth: 240,
  },
  xl2: {
    breakpoint: 1536,
    columns: null, // auto-fill
    minItemWidth: 280,
  },
} as const;

/**
 * Calculate number of columns based on viewport width
 */
export function getColumnsForWidth(width: number): number {
  // Mobile: 2 columns
  if (width < GRID_CONFIG.sm.breakpoint) {
    return GRID_CONFIG.mobile.columns;
  }

  // 2XL: auto-fill with minmax(280px, 1fr)
  if (width >= GRID_CONFIG.xl2.breakpoint) {
    return Math.floor(width / GRID_CONFIG.xl2.minItemWidth);
  }

  // SM to XL: auto-fill with minmax(240px, 1fr)
  return Math.floor(width / GRID_CONFIG.sm.minItemWidth);
}

/**
 * Calculate how many items to load for pagination
 * Always loads exactly 2 full rows, with a minimum of 8 items
 */
export function calculateItemsToLoad(viewportWidth?: number): number {
  // Default to mobile if width is not provided
  const width = viewportWidth ?? GRID_CONFIG.mobile.breakpoint;
  const columns = getColumnsForWidth(width);
  const itemsForTwoRows = columns * 2;

  // Ensure minimum of 8 items
  return Math.max(itemsForTwoRows, 8);
}

/**
 * Hook to get current viewport width (client-side only)
 */
export function useViewportWidth(): number {
  if (typeof window === "undefined") {
    return GRID_CONFIG.mobile.breakpoint;
  }

  return window.innerWidth;
}

/**
 * Get items to load based on current viewport
 * This can be used in client components
 */
export function getItemsToLoad(): number {
  if (typeof window === "undefined") {
    // Server-side: return default (8 items minimum)
    return 8;
  }

  return calculateItemsToLoad(window.innerWidth);
}
