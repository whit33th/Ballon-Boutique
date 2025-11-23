import { createNavigation } from "next-intl/navigation";
import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  // A list of all locales that are supported
  locales: ["de", "en", "uk", "ru"],

  // Used when no locale matches
  defaultLocale: "de",
  localeDetection: false,
  localeCookie: true,

  // Always show the locale prefix in the URL
  localePrefix: "always",
});

// Lightweight wrappers around Next.js' navigation APIs
// that will consider the routing configuration
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
