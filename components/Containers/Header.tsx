"use client";

import { Authenticated, Unauthenticated, useMutation } from "convex/react";
import { useQuery } from "convex-helpers/react/cache";
import { ShieldCheck, ShoppingBag, User } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { UserNav } from "@/components/ui/user-nav";
import { api } from "@/convex/_generated/api";
import { Link, useRouter } from "@/i18n/routing";
import { mapGuestCartForImport, useGuestCart } from "@/lib/guestCart";
import IconButton from "../ui/icon-button";

export function Header() {
  const t = useTranslations("header");
  const tBanner = useTranslations("discountsBanner");
  const tCatalog = useTranslations("catalog");
  const cartTotal = useQuery(api.cart.getTotal);
  const activeDiscounts = useQuery(api.discounts.listActivePublic);
  const user = useQuery(api.auth.loggedInUser);
  const {
    items: guestItems,
    totalCount: guestItemCount,
    initialized: guestCartReady,
    clear: clearGuestCart,
  } = useGuestCart();
  const isAuthenticated = Boolean(user);
  const importGuestCart = useMutation(api.cart.importGuestItems);
  const importInFlight = useRef(false);
  const badgeCount = isAuthenticated
    ? (cartTotal?.itemCount ?? 0)
    : guestItemCount;
  const router = useRouter();
  const [activeDiscountIndex, setActiveDiscountIndex] = useState(0);

  const sortedDiscounts = useMemo(() => {
    if (!activeDiscounts || activeDiscounts.length === 0) {
      return [];
    }
    return activeDiscounts
      .filter(
        (discount) =>
          discount.scopeType === "group" || discount.scopeType === "category",
      )
      .sort((a, b) => {
        if (a.percentage !== b.percentage) {
          return b.percentage - a.percentage;
        }
        return a.name.localeCompare(b.name);
      });
  }, [activeDiscounts]);

  const activeDiscount =
    sortedDiscounts.length > 0
      ? sortedDiscounts[activeDiscountIndex % sortedDiscounts.length]
      : null;

  useEffect(() => {
    if (!activeDiscount || sortedDiscounts.length <= 1) {
      return;
    }

    const interval = window.setInterval(() => {
      setActiveDiscountIndex((prev) => (prev + 1) % sortedDiscounts.length);
    }, 4000);

    return () => window.clearInterval(interval);
  }, [activeDiscount, sortedDiscounts.length]);

  useEffect(() => {
    if (sortedDiscounts.length === 0) {
      setActiveDiscountIndex(0);
      return;
    }

    if (activeDiscountIndex >= sortedDiscounts.length) {
      setActiveDiscountIndex(0);
    }
  }, [activeDiscountIndex, sortedDiscounts.length]);

  useEffect(() => {
    if (!guestCartReady || !isAuthenticated || guestItems.length === 0) {
      importInFlight.current = false;
      return;
    }

    if (importInFlight.current) {
      return;
    }

    importInFlight.current = true;

    const run = async () => {
      try {
        await importGuestCart({
          items: mapGuestCartForImport(guestItems),
        });
        clearGuestCart();
        router.refresh();
      } catch (error) {
        console.error("Failed to import guest cart", error);
      } finally {
        importInFlight.current = false;
      }
    };

    void run();

    return () => {
      importInFlight.current = false;
    };
  }, [
    guestCartReady,
    isAuthenticated,
    guestItems,
    importGuestCart,
    clearGuestCart,
    router,
  ]);

  const resolveGroupLabel = (value?: string) => {
    if (!value) {
      return "";
    }
    const key = `categoryGroups.${value}`;
    return tCatalog.has(key) ? tCatalog(key) : value;
  };

  const resolveCategoryLabel = (value?: string) => {
    if (!value) {
      return "";
    }
    const key = `subcategories.${value}`;
    return tCatalog.has(key) ? tCatalog(key) : value;
  };

  const resolveDiscountLabel = () => {
    if (!activeDiscount) {
      return "";
    }

    if (activeDiscount.scopeType === "group") {
      return tBanner("titleGroup", {
        percent: activeDiscount.percentage,
        group: resolveGroupLabel(activeDiscount.categoryGroup),
      });
    }

    if (activeDiscount.scopeType === "category") {
      return tBanner("titleCategory", {
        percent: activeDiscount.percentage,
        group: resolveGroupLabel(activeDiscount.categoryGroup),
        category: resolveCategoryLabel(activeDiscount.category),
      });
    }

    return tBanner("titleGeneric", { percent: activeDiscount.percentage });
  };

  const resolveDiscountHref = () => {
    if (!activeDiscount) {
      return "/catalog";
    }

    const params = new URLSearchParams();
    params.set("sale", "true");
    if (activeDiscount.categoryGroup) {
      params.set("categoryGroup", activeDiscount.categoryGroup);
    }
    if (activeDiscount.category) {
      params.set("category", activeDiscount.category);
    }

    const queryString = params.toString();
    return queryString ? `/catalog?${queryString}` : "/catalog";
  };

  return (
    <>
      {activeDiscount ? (
        <Link
          href={resolveDiscountHref()}
          className="bg-accent underline-offset-1.5 flex items-center justify-center bg-linear-to-r px-3 py-2.5 text-center text-xs font-semibold tracking-[0.2em] text-white underline transition-colors"
          data-testid="discounts-banner"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={`${activeDiscount._id}-${activeDiscountIndex}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="inline-flex items-center gap-2"
            >
              {resolveDiscountLabel()}
            </motion.span>
          </AnimatePresence>
        </Link>
      ) : null}

      <header
        className="group bg-primary/95 sticky top-0 z-50 flex w-full grid-cols-3 justify-between border-b py-2 backdrop-blur-sm"
        data-testid="site-header"
      >
        <Image
          unoptimized
          src="/imgs/gif/header-hover-compressed.webp"
          alt="Premium Balloons Collection"
          width={1000}
          height={56}
          sizes="56px"
          className="pointer-events-none absolute inset-0 -z-10 hidden h-full w-full object-cover opacity-0 blur-md contrast-150 transition-opacity duration-400 group-hover:opacity-8 sm:block"
        />

        <nav className="flex items-center gap-2 justify-self-start px-4 sm:px-8">
          <Link
            href="/"
            data-testid="nav-home"
            className="text-deep text-md flex items-center gap-3 font-semibold tracking-tight sm:text-xl"
          >
            <Image
              className="rounded"
              src="/logo.png"
              alt="Logo"
              width={30}
              height={30}
              priority
              loading="eager"
            />
            {t("logo")}
          </Link>
        </nav>
        <div className="flex items-center justify-center"></div>

        <div className="flex items-center gap-0.5 justify-self-end px-1 sm:gap-3 sm:px-3">
          <LanguageSwitcher />
          {user?.isAdmin ? (
            <Link href="/admin" data-testid="nav-admin">
              <IconButton Icon={ShieldCheck} ariaLabel="Admin" />
            </Link>
          ) : null}
          <AuthAction />
          <Link href="/cart" className="relative" data-testid="nav-cart">
            <IconButton Icon={ShoppingBag} ariaLabel={t("openCart")} />
            {badgeCount > 0 && (
              <span className="bg-accent text-on-accent absolute top-0 right-2.5 flex min-h-[1.2rem] min-w-[1.2rem] translate-x-1/2 items-center justify-center rounded-full px-1 py-0.5 text-[0.7rem] md:right-1.5">
                {badgeCount > 99 ? "99+" : badgeCount}
              </span>
            )}
          </Link>
        </div>
      </header>
    </>
  );
}

function AuthAction() {
  const t = useTranslations("header");
  const user = useQuery(api.auth.loggedInUser);

  return (
    <>
      <Authenticated>
        {/* Use the shared `UserNav` component for the account menu (pass full user so imageFileId is available) */}
        <UserNav user={user ?? undefined} />
      </Authenticated>
      <Unauthenticated>
        <Link
          href="/auth"
          data-testid="nav-auth"
          className="text-deep flex gap-1 text-sm font-medium transition-colors hover:opacity-70"
        >
          <button
            type="button"
            aria-label="Open sign in page"
            className="text-deep flex h-10 w-10 items-center justify-center rounded-full bg-transparent outline-black/5 backdrop-blur-xs transition-colors hover:bg-black/10 hover:opacity-80 hover:outline sm:hidden"
          >
            <User className="h-5 w-5 text-current" />
          </button>
          <span className="border-deep hidden h-10 w-auto items-center justify-center rounded-lg border-2 px-3 sm:flex">
            {t("logIn")}
          </span>
        </Link>
      </Unauthenticated>
    </>
  );
}
