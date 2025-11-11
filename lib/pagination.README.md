# Pagination Configuration

This module calculates how many items to load for pagination based on the viewport width and grid layout.

## Grid Layout

The product grid uses the following CSS configuration:

- **Mobile** (`< 640px`): `grid-cols-2` (2 columns)
- **Small to XL** (`640px - 1536px`): `grid-cols-[repeat(auto-fill,minmax(240px,1fr))]`
- **2XL** (`>= 1536px`): `grid-cols-[repeat(auto-fill,minmax(280px,1fr))]`

## Configuration

You can modify the grid configuration in `lib/pagination.ts`:

```typescript
export const GRID_CONFIG = {
  mobile: {
    breakpoint: 0,
    columns: 2,
    minItemWidth: 0,
  },
  sm: {
    breakpoint: 640, // Change this to adjust Small breakpoint
    columns: null,
    minItemWidth: 240, // Change this to adjust min item width for SM-XL
  },
  xl2: {
    breakpoint: 1536, // Change this to adjust 2XL breakpoint
    columns: null,
    minItemWidth: 280, // Change this to adjust min item width for 2XL+
  },
};
```

## Functions

### `calculateItemsToLoad(viewportWidth?: number): number`

Calculates how many items to load for pagination.

**Rules:**

- Always loads exactly **2 full rows**
- Minimum of **8 items** regardless of screen size

**Examples:**

- Mobile (375px width): 2 columns × 2 rows = 4 items → Returns **8** (minimum)
- Tablet (768px width): 3 columns × 2 rows = **6** items → Returns **8** (minimum)
- Desktop (1440px width): 6 columns × 2 rows = **12** items
- Large Desktop (1920px width): 6 columns × 2 rows = **12** items

### `getColumnsForWidth(width: number): number`

Returns the number of columns for a given viewport width.

### `getItemsToLoad(): number`

Convenience function that automatically uses the current window width.
Returns 8 on server-side.

## Usage

### In ProductGrid Component

```tsx
import { calculateItemsToLoad } from "@/lib/pagination";

const [itemsToLoad, setItemsToLoad] = useState(() => calculateItemsToLoad());

useEffect(() => {
  const updateItemsToLoad = () => {
    setItemsToLoad(calculateItemsToLoad(window.innerWidth));
  };

  window.addEventListener("resize", updateItemsToLoad);
  updateItemsToLoad();

  return () => window.removeEventListener("resize", updateItemsToLoad);
}, []);

// Use in pagination
usePaginatedQuery(api.products.list, queryArgs, {
  initialNumItems: itemsToLoad,
});

// Use in loadMore
loadMore(itemsToLoad);
```

## Customization

To change the number of items loaded:

1. **Modify breakpoints**: Change `GRID_CONFIG.sm.breakpoint` or `GRID_CONFIG.xl2.breakpoint`
2. **Modify minimum item widths**: Change `GRID_CONFIG.sm.minItemWidth` or `GRID_CONFIG.xl2.minItemWidth`
3. **Change minimum items**: Modify the minimum value in `calculateItemsToLoad()`:
   ```typescript
   return Math.max(itemsForTwoRows, 8); // Change 8 to your desired minimum
   ```
4. **Change number of rows**: Modify the multiplier in `calculateItemsToLoad()`:
   ```typescript
   const itemsForTwoRows = columns * 2; // Change 2 to load more/fewer rows
   ```

## Notes

- The grid automatically adjusts based on Tailwind CSS breakpoints
- Always ensure the grid configuration matches your CSS
- The minimum of 8 items ensures a good user experience on all devices
