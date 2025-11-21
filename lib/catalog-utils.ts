import {
  type CategoryGroupValue,
  PRODUCT_CATEGORY_GROUPS,
} from "@/constants/categories";

export function normalizeGroup(
  value?: string | null,
): CategoryGroupValue | null {
  if (!value) return null;
  let normalized = value;
  try {
    normalized = decodeURIComponent(value);
  } catch {
    normalized = value;
  }
  normalized = normalized
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-");

  const byValue = PRODUCT_CATEGORY_GROUPS.find((c) => c.value === normalized);
  if (byValue) return byValue.value;

  const byLabel = PRODUCT_CATEGORY_GROUPS.find(
    (c) => c.label.toLowerCase().replace(/[_\s]+/g, "-") === normalized,
  );
  if (byLabel) return byLabel.value;

  const byCategoryValue = PRODUCT_CATEGORY_GROUPS.find(
    (c) =>
      (c.categoryValue ?? "").toLowerCase().replace(/[_\s]+/g, "-") ===
      normalized,
  );
  if (byCategoryValue) return byCategoryValue.value;

  const partial = PRODUCT_CATEGORY_GROUPS.find((c) =>
    normalized.includes(c.value),
  );
  if (partial) return partial.value;

  return null;
}
