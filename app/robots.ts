import type { MetadataRoute } from "next";
import { STORE_INFO } from "@/constants/config";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = STORE_INFO.website || "https://ballon.boutique";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin/",
          "/api/",
          "/profile/",
          "/cart/",
          "/checkout/",
          "/checkout/confirmant/",
          "/checkout/declined/",
        ],
      },
      {
        userAgent: ["Googlebot", "Bingbot"],
        allow: "/",
        disallow: [
          "/admin/",
          "/api/",
          "/profile/",
          "/cart/",
          "/checkout/",
          "/checkout/confirmant/",
          "/checkout/declined/",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
