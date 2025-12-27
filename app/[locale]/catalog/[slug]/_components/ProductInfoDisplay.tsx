import { Sparkles } from "lucide-react";
import { getTranslations } from "next-intl/server";

interface ProductInfoDisplayProps {
  locale: string;
  name: string;
  description: string;
  price: number;
  inStock: boolean;
  hidePrice?: boolean;
}

export async function ProductInfoDisplay({
  locale,
  name,
  description,
  price,
  inStock,
  hidePrice,
}: ProductInfoDisplayProps) {
  const t = await getTranslations({ locale, namespace: "product" });

  return (
    <div className="space-y-8">
      <div>
        <p className="text-secondary flex items-center gap-2 text-xs font-semibold tracking-widest uppercase">
          <Sparkles className="h-4 w-4" />
          {t("forSpecialOccasions")}
        </p>
        <h1 className="text-deep mt-3 text-4xl leading-tight font-bold lg:text-5xl">
          {name}
        </h1>
        <p className="text-deep/70 mt-5 max-w-2xl text-base leading-relaxed">
          {description}
        </p>
      </div>

      <div className="flex flex-wrap items-baseline justify-between gap-4">
        {hidePrice ? null : (
          <div>
            <span className="text-deep/50 mb-1 block text-xs tracking-wider uppercase">
              {t("price")}
            </span>
            <span className="text-deep text-2xl font-bold sm:text-3xl lg:text-4xl 2xl:text-5xl">
              {price.toFixed(2)} €
            </span>
          </div>
        )}
        <span
          className={`rounded-full px-5 py-2 text-sm font-semibold tracking-wide uppercase ${
            inStock ? "bg-secondary/10 text-secondary" : "bg-deep/10 text-deep"
          }`}
        >
          {inStock ? t("inStock") : t("outOfStock")}
        </span>
      </div>
    </div>
  );
}
