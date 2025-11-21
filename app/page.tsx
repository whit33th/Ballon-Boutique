import { preloadQuery } from "convex/nextjs";
import { CategorySection } from "@/components/CategorySection";
import { Hero } from "@/components/Containers";
import { AnimatedSection } from "@/components/ui/animated-section";
import RainbowArcText from "@/components/ui/rainbow-text";
import { api } from "@/convex/_generated/api";
import { ProductCarousels } from "./ProductCarousels";

export default async function HomePage() {
  // Preload data on the server using preloadQuery
  const preloadedBestsellers = await preloadQuery(api.products.list, {
    order: "orderCount-desc",
    paginationOpts: {
      cursor: null,
      numItems: 8,
    },
  });

  const preloadedNewArrivals = await preloadQuery(api.products.list, {
    order: "createdAt-desc",
    paginationOpts: {
      cursor: null,
      numItems: 8,
    },
  });

  return (
    <main className="flex min-h-screen flex-col">
      <AnimatedSection>
        <Hero />
      </AnimatedSection>

      <div className="flex flex-col gap-6">
        <AnimatedSection>
          <CategorySection />
        </AnimatedSection>

        {/* Product Carousels - Client Component with preloaded data */}
        <ProductCarousels
          preloadedBestsellers={preloadedBestsellers}
          preloadedNewArrivals={preloadedNewArrivals}
        />
      </div>

      {/* Rainbow Text */}
      <RainbowArcText
        className="py-5 text-[10vw] sm:text-[8vw]"
        text="Lift Your Day"
      />
    </main>
  );
}
