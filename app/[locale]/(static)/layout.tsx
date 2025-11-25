import type { ReactNode } from "react";
import { routing } from "@/i18n/routing";

export const dynamic = "force-static";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default function StaticLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}


