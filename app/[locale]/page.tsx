import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { CategorySection } from "@/components/CategorySection";
import { Hero } from "@/components/Containers";
import RainbowArcText from "@/components/ui/rainbow-text";
import { generateHomeMetadata, OrganizationJsonLd } from "@/SEO";
import { ProductCarouselsFallback } from "./_components/ProductCarouselsFallback";
import { ProductCarouselsWrapper } from "./_components/ProductCarouselsWrapper";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return generateHomeMetadata(locale);
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "home" });

  return (
    <>
      <OrganizationJsonLd locale={locale} />
      <section className="flex min-h-screen flex-col">
        <Hero />

        <div className="flex flex-col gap-6">
          <CategorySection />

          <Suspense fallback={<ProductCarouselsFallback />}>
            <ProductCarouselsWrapper />
          </Suspense>
        </div>

        <RainbowArcText
          className="py-5 text-[10vw] sm:text-[8vw]"
          text={t("rainbowText")}
        />
      </section>
    </>
  );
}
