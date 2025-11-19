import { Suspense } from "react";
import CatalogPage from "./ClientPage";

export default function page() {
  return (
    <Suspense fallback={<div>loading</div>}>
      <CatalogPage />
    </Suspense>
  );
}
