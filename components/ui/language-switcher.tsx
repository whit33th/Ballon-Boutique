"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePathname } from "@/i18n/routing";
import { removeLocaleFromPathname } from "@/i18n/utils";
import { persistLocalePreference } from "@/lib/localePreference";
import { cn } from "@/lib/utils";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useTransition } from "react";
import {
  AustriaFlag,
  GreatBritainFlag,
  RussiaFlag,
  UkraineFlag,
} from "./icons/flags";

const languages = [
  {
    code: "de",
    langKey: "de",
    name: "Deutsch",
    flag: AustriaFlag,
  },
  {
    code: "en",
    langKey: "en",
    name: "English",
    flag: GreatBritainFlag,
  },
  {
    code: "uk",
    langKey: "uk",
    name: "Українська",
    flag: UkraineFlag,
  },
  {
    code: "ru",
    langKey: "ru",
    name: "Русский",
    flag: RussiaFlag,
  },
] as const;

export function LanguageSwitcher() {
  const locale = useLocale();
  const t = useTranslations("languages");
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentLanguage =
    languages.find((lang) => lang.code === locale) || languages[0];
  const CurrentFlag = currentLanguage.flag;

  const switchLocale = (newLocale: string) => {
    startTransition(() => {
      void persistLocalePreference(newLocale);
      const pathnameWithoutLocale = removeLocaleFromPathname(pathname);

      const searchParamsString = searchParams.toString();
      const newUrl = `/${newLocale}${pathnameWithoutLocale}${searchParamsString ? `?${searchParamsString}` : ""}`;
      window.location.href = newUrl;
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Switch language"
          disabled={isPending}
          className="text-deep group relative flex h-10 w-10 items-center justify-center rounded-full bg-transparent p-2 outline-black/5 backdrop-blur-xs transition-all hover:bg-black/10 hover:opacity-80 hover:outline"
        >
          <div className="relative h-full w-full">
            <CurrentFlag className="h-full w-full rounded-full" />
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="border-foreground/15 w-80 border p-0"
        align="end"
        forceMount
      >
        <div className="p-2">
          <div className="space-y-1">
            {languages.map((lang) => {
              const FlagComponent = lang.flag;
              const isSelected = locale === lang.code;

              const languageRegion = t(`${lang.langKey}.region`);
              return (
                <DropdownMenuItem
                  key={lang.code}
                  onClick={() => switchLocale(lang.code)}
                  disabled={isPending}
                  className={cn(
                    "group cursor-pointer rounded-lg px-3 py-2.5 transition-colors",
                    isSelected
                      ? "bg-[#F5F1ED]"
                      : "bg-transparent hover:bg-[#F5F1ED]",
                  )}
                >
                  <div className="flex w-full items-center gap-3">
                    <div
                      className={cn(
                        "flex size-9 shrink-0 items-center justify-center rounded-lg border transition-colors",
                        isSelected
                          ? "border-[#D4A574]/30 bg-linear-to-br from-[#D4A574]/10 to-[#E8C4A0]/10"
                          : "border-[#D4A574]/20 bg-linear-to-br from-[#D4A574]/10 to-[#E8C4A0]/10 group-hover:border-[#D4A574]/30",
                      )}
                    >
                      <FlagComponent className="size-5 rounded-full" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "text-sm font-medium transition-colors",
                          isSelected
                            ? "text-deep group-hover:text-white"
                            : "text-deep group-hover:text-white",
                        )}
                      >
                        {lang.name}
                      </p>
                      <p
                        className={cn(
                          "text-xs transition-colors",
                          isSelected
                            ? "text-[#6B6662] group-hover:text-white"
                            : "text-[#6B6662] group-hover:text-white",
                        )}
                      >
                        {languageRegion}
                      </p>
                    </div>
                    {isSelected && (
                      <div className="flex shrink-0 items-center justify-center">
                        <svg
                          className="h-5 w-5 text-[#D4A574]"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                          aria-label="Selected language"
                        >
                          <title>Selected</title>
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                </DropdownMenuItem>
              );
            })}
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
