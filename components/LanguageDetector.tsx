"use client";

import { useLocale } from "next-intl";
import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "@/i18n/routing";
import { removeLocaleFromPathname } from "@/i18n/utils";
import { persistLocalePreference } from "@/lib/localePreference";

// Map country codes to locale codes
const countryToLocale: Record<string, string> = {
  AT: "de", // Austria
  DE: "de", // Germany
  UK: "uk", // Ukraine
  RU: "ru", // Russia
};

export function LanguageDetector() {
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();
  const hasDetected = useRef(false);

  useEffect(() => {
    // Only run detection once per session
    if (hasDetected.current) {
      return;
    }

    // Check if user has already selected a language (from cookie)
    const savedLocaleCookie = document.cookie
      .split("; ")
      .find((row) => row.startsWith("NEXT_LOCALE="))
      ?.split("=")[1];

    // If user has a saved preference that matches current locale, do nothing
    if (savedLocaleCookie && savedLocaleCookie === locale) {
      hasDetected.current = true;
      return;
    }

    // If user has a saved preference that doesn't match, redirect once
    if (savedLocaleCookie && savedLocaleCookie !== locale) {
      hasDetected.current = true;
      // Remove any locale prefix that might be present
      const pathnameWithoutLocale = removeLocaleFromPathname(pathname);
      router.push(`/${savedLocaleCookie}${pathnameWithoutLocale}`);
      return;
    }

    // Only detect from geolocation if no saved preference exists
    // and we haven't detected yet
    if (!savedLocaleCookie && !hasDetected.current) {
      hasDetected.current = true;

      // Use a free geolocation API
      fetch("https://ipapi.co/json/")
        .then((res) => res.json())
        .then((data) => {
          const countryCode = data.country_code;
          const detectedLocale = countryToLocale[countryCode] || "de"; // Default to Austria (German)

          // Only redirect if detected locale is different from current
          if (detectedLocale !== locale) {
            // Save preference
            void persistLocalePreference(detectedLocale);
            // Remove any locale prefix that might be present
            const pathnameWithoutLocale = removeLocaleFromPathname(pathname);
            router.push(`/${detectedLocale}${pathnameWithoutLocale}`);
          }
        })
        .catch((error) => {
          // Silently fail - user stays on current locale
          console.error("Failed to detect location:", error);
        });
    }
  }, [locale, pathname, router]);

  return null; // This component doesn't render anything
}
