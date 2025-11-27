"use client";

import { Authenticated, Unauthenticated, useMutation } from "convex/react";
import { useQuery } from "convex-helpers/react/cache";
import { ShieldCheck, ShoppingBag, User } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { UserNav } from "@/components/ui/user-nav";
import { api } from "@/convex/_generated/api";
import { Link, useRouter } from "@/i18n/routing";
import { mapGuestCartForImport, useGuestCart } from "@/lib/guestCart";
import IconButton from "../ui/icon-button";

export function Header() {
  const t = useTranslations("header");
  const cartTotal = useQuery(api.cart.getTotal);
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

  return (
    <header className="bg-primary/95 group sticky top-0 z-50 flex w-full grid-cols-3 justify-between border-b py-2 backdrop-blur-sm">
      <Image
        unoptimized
        src="/imgs/gif/header-hover-compressed.webp"
        alt="Premium Balloons Collection"
        width={1000}
        height={56}
        sizes="56px"
        className="pointer-events-none absolute inset-0 -z-10 hidden h-full w-full object-cover opacity-0 blur-md contrast-150 transition-opacity duration-400 group-hover:opacity-10 sm:block"
      />

      <nav className="flex items-center gap-2 justify-self-start px-4 sm:px-8">
        <Link
          href="/"
          className="text-deep text-md flex items-center gap-3 text-center font-semibold tracking-tight sm:text-xl"
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
          <Link href="/admin">
            <IconButton Icon={ShieldCheck} ariaLabel="Admin" />
          </Link>
        ) : null}
        <AuthAction />
        <Link href="/cart" className="relative">
          <IconButton Icon={ShoppingBag} ariaLabel={t("openCart")} />
          {badgeCount > 0 && (
            <span className="bg-accent text-on-accent absolute top-0 right-2.5 flex min-h-[1.2rem] min-w-[1.2rem] translate-x-1/2 items-center justify-center rounded-full px-1 py-0.5 text-[0.7rem] md:right-1.5">
              {badgeCount > 99 ? "99+" : badgeCount}
            </span>
          )}
        </Link>
      </div>
    </header>
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
