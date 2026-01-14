import type { MetadataRoute } from "next";
import { STORE_INFO } from "@/constants/config";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: STORE_INFO.name,
    short_name: STORE_INFO.name,
    description: STORE_INFO.slogan,
    start_url: "/",
    display: "standalone",
    display_override: ["standalone", "browser"],
    background_color: STORE_INFO.backgroundColor || "#ffdfc6",
    theme_color: "#ffdfc6",
    orientation: "portrait-primary",
    scope: "/",
    lang: "de",
    dir: "ltr",
    id: "/",
    categories: ["shopping", "lifestyle", "party"],
    icons: [
      {
        src: "/favicon.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/logo.png",
        sizes: "any",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/web-app-manifest-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/web-app-manifest-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
    ],
    screenshots: [
      //   {
      //     src: "/screenshots/home-mobile.png",
      //     sizes: "375x812",
      //     type: "image/png",
      //     label: "Home page on mobile",
      //   },
      //   {
      //     src: "/screenshots/home-tablet.png",
      //     sizes: "768x1024",
      //     type: "image/png",
      //     label: "Home page on tablet",
      //   },
      //   {
      //     src: "/screenshots/home-desktop.png",
      //     sizes: "1920x1080",
      //     type: "image/png",
      //     label: "Home page on desktop",
      //   },
      //   {
      //     src: "/screenshots/catalog-mobile.png",
      //     sizes: "375x812",
      //     type: "image/png",
      //     label: "Catalog page on mobile",
      //   },
      //   {
      //     src: "/screenshots/catalog-desktop.png",
      //     sizes: "1920x1080",
      //     type: "image/png",
      //     label: "Catalog page on desktop",
      //   },
      //   {
      //     src: "/screenshots/product-mobile.png",
      //     sizes: "375x812",
      //     type: "image/png",
      //     label: "Product page on mobile",
      //   },
      //   {
      //     src: "/screenshots/product-desktop.png",
      //     sizes: "1920x1080",
      //     type: "image/png",
      //     label: "Product page on desktop",
      //   },
      // Add later
    ],
    shortcuts: [
      {
        name: "Catalog",
        short_name: "Catalog",
        description: "Browse our balloon catalog",
        url: "/catalog",
        icons: [
          {
            src: "/logo.png",
            sizes: "any",
            type: "image/png",
          },
        ],
      },
    ],
    related_applications: [],
    prefer_related_applications: false,
  };
}
