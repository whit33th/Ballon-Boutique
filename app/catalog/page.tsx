import { Suspense } from "react";
import CatalogClient from "./CatalogClient";

export default function CatalogPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <CatalogClient />
    </Suspense>
  );
}
