import { preloadQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { HomePageClient } from "./HomePageClient";

export default async function HomePage() {
  // Prefetch bestsellers data on the server
  const preloadedBestsellers = await preloadQuery(api.products.list, {
    paginationOpts: {
      cursor: null,
      numItems: 10,
    },
  });

  // Prefetch new products data on the server
  const preloadedNewProducts = await preloadQuery(api.products.getNewProducts, {
    daysOld: 7,
    paginationOpts: {
      cursor: null,
      numItems: 10,
    },
  });

  return (
    <HomePageClient
      preloadedBestsellers={preloadedBestsellers}
      preloadedNewProducts={preloadedNewProducts}
    />
  );
}
