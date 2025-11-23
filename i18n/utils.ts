import { routing } from "./routing";

export function isSupportedLocale(
  value: string | null | undefined,
): value is (typeof routing)["locales"][number] {
  if (typeof value !== "string") return false;
  const locales = routing.locales as readonly string[];
  return locales.includes(value);
}

/**
 * Removes locale prefix from pathname if present.
 * Handles cases like /de, /de/, /en/page, etc.
 * @param pathname - The pathname that may or may not contain a locale prefix
 * @returns Pathname without locale prefix, always starting with /
 */
export function removeLocaleFromPathname(
  pathname: string | null | undefined,
): string {
  let pathnameWithoutLocale = pathname || "/";

  // Remove locale prefix if it exists (handle both /locale and /locale/ cases)
  const locales = routing.locales as readonly string[];
  for (const loc of locales) {
    if (pathnameWithoutLocale.startsWith(`/${loc}/`)) {
      pathnameWithoutLocale = pathnameWithoutLocale.slice(`/${loc}`.length);
      break;
    } else if (pathnameWithoutLocale === `/${loc}`) {
      pathnameWithoutLocale = "/";
      break;
    }
  }

  // Ensure pathname starts with /
  if (!pathnameWithoutLocale.startsWith("/")) {
    pathnameWithoutLocale = `/${pathnameWithoutLocale}`;
  }

  return pathnameWithoutLocale;
}
