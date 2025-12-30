import Image from "next/image";
import { getTranslations } from "next-intl/server";
import {
  buildCatalogLink,
  buildCategoryPagePath,
  PRODUCT_CATEGORY_GROUPS,
} from "@/constants/categories";
import { Link } from "@/i18n/routing";

export async function CategorySection() {
  const t = await getTranslations("home");
  const tCatalog = await getTranslations("catalog");

  return (
    <section className="relative w-full overflow-hidden">
      <div className="flex items-center justify-between p-4 px-4">
        <h2 className="flex max-w-2xl gap-1.5 truncate text-xl leading-tight md:text-2xl">
          <span>{t("shopBy")}</span>
          <span>✧</span>
          <span>{t("category")}</span>
        </h2>
      </div>
      <div className="border-foreground grid w-full grid-cols-2 gap-0 border-t md:grid-cols-4">
        {PRODUCT_CATEGORY_GROUPS.map((group, index) => {
          const hasSubcategories = group.subcategories.length > 0;
          const collectionsCount =
            group.value === "balloons" || group.value === "balloon-bouquets"
              ? group.subcategories.filter((s) => s.value !== "Any Event")
                  .length
              : group.subcategories.length;
          // Assign colors based on category - matching product card theme
          const balloonColors = [
            "#FFB3BA", // pastel pink
            "#BAFFC9", // pastel green
            "#BAE1FF", // pastel blue
            "#FFFFBA", // pastel yellow
            "#FFD4BA", // pastel orange
            "#E0BBE4", // pastel purple
          ];
          const colorIndex = index % balloonColors.length;
          const bgColor = balloonColors[colorIndex];

          // Build href - for category pages use string path, for catalog use object
          const href = hasSubcategories
            ? buildCategoryPagePath(group.value)
            : group.categoryValue
              ? buildCatalogLink(group.value, { category: group.categoryValue })
              : buildCatalogLink(group.value);

          return (
            <Link
              key={group.value}
              href={href}
              className="focus-visible:ring-accent focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              <div className="border-foreground flex h-full flex-col border-r border-b">
                {/* Category Image with colorful background */}
                <div
                  className="relative aspect-square w-full sm:aspect-3/4"
                  style={{ backgroundColor: bgColor }}
                >
                  <Image
                    src={group.icon}
                    alt={tCatalog(`categoryGroups.${group.value}`)}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, 25vw"
                    priority
                    fetchPriority="high"
                  />
                </div>

                {/* Category Info */}
                <div className="border-foreground relative flex flex-col gap-0.5 border-t px-3 py-2 sm:gap-1 sm:px-4 sm:py-3">
                  <h3 className="text-sm leading-tight font-semibold">
                    {tCatalog(`categoryGroups.${group.value}`)}
                  </h3>
                  <span className="text-xs font-medium text-[rgba(var(--deep-rgb),0.70)]">
                    {hasSubcategories
                      ? t("collectionsCount", { count: collectionsCount })
                      : t("viewCollection")}
                  </span>
                </div>
              </div>
            </Link>
          );
        })}

        <Link
          href="/catalog"
          className="focus-visible:ring-accent focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          <div className="border-foreground flex h-full flex-col border-r border-b">
            <div
              className="relative aspect-square w-full sm:aspect-3/4"
              style={{ backgroundColor: "#f6f7fb" }}
            >
              <Image
                src="/imgs/categories/all-products.webp"
                alt={t("allProducts")}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 50vw, 25vw"
                priority
                fetchPriority="high"
              />
            </div>

            <div className="border-foreground relative flex flex-col gap-0.5 border-t px-3 py-2 sm:gap-1 sm:px-4 sm:py-3">
              <h3 className="text-sm leading-tight font-semibold">
                {t("allProducts")}
              </h3>
              <span className="text-xs font-medium text-[rgba(var(--deep-rgb),0.70)]">
                {t("viewAllItems")}
              </span>
            </div>
          </div>
        </Link>
      </div>
    </section>
  );
}
