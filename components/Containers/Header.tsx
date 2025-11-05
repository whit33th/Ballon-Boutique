"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import {
  Authenticated,
  Unauthenticated,
  useMutation,
  useQuery,
} from "convex/react";
import { LogOut, ShoppingBag, User, UserCircle } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { mapGuestCartForImport, useGuestCart } from "@/lib/guestCart";
import { api } from "../../convex/_generated/api";
import IconButton from "../ui/icon-button";

export function Header() {
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
      } catch (error) {
        console.error("Failed to import guest cart", error);
      } finally {
        importInFlight.current = false;
      }
    };

    void run();
  }, [
    guestCartReady,
    isAuthenticated,
    guestItems,
    importGuestCart,
    clearGuestCart,
  ]);

  const pathname = usePathname();

  // Определяем текущую страницу для мобильного меню
  const getCurrentPage = () => {
    if (pathname === "/" || pathname === "") return "Home";
    if (pathname.startsWith("/catalog")) return "Catalog";
    if (pathname.startsWith("/cart")) return "Cart";
    if (pathname.startsWith("/checkout")) return "Checkout";
    if (pathname.startsWith("/profile")) return "Profile";
    if (pathname.startsWith("/auth")) return "Auth";
    return "Home";
  };

  return (
    <header className="bg-primary/95 sticky top-0 z-50 grid w-full grid-cols-3 border-b py-2 backdrop-blur-sm">
      <nav className="flex items-center gap-4 justify-self-start px-4 sm:gap-6 sm:px-8">
        {/* Мобильное меню - показывает текущую страницу и dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="text-deep flex items-center gap-1 text-sm font-medium tracking-wide uppercase transition-colors hover:opacity-80 sm:hidden"
            >
              {getCurrentPage()}
              <svg
                className="h-3.5 w-3.5 transition-transform"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <title>Toggle menu</title>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="border-secondary/20 w-fit"
          >
            <DropdownMenuItem asChild>
              <Link
                href="/"
                className="text-deep hover:bg-secondary/10 cursor-pointer"
              >
                Home
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link
                href="/catalog"
                className="text-deep hover:bg-secondary/10 cursor-pointer"
              >
                Catalog
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Desktop меню - всегда видны ссылки */}
        <Link
          href="/"
          className="text-deep hidden text-sm font-medium tracking-wide uppercase transition-colors hover:opacity-80 sm:block"
        >
          Home
        </Link>
        <Link
          href="/catalog"
          className="text-deep hidden text-sm font-medium tracking-wide uppercase transition-colors hover:opacity-80 sm:block"
        >
          Catalog
        </Link>
      </nav>
      <div className="flex items-center justify-center">
        <Link
          href="/"
          className="text-deep flex items-center text-xl font-semibold tracking-tight"
        >
          UP&UP
        </Link>
      </div>

      <div className="flex items-center gap-3 justify-self-end px-1 sm:px-3">
        <AuthAction />
        <Link href="/cart" className="relative">
          <IconButton Icon={ShoppingBag} />
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
  const { signOut } = useAuthActions();
  const user = useQuery(api.auth.loggedInUser);

  return (
    <>
      <Authenticated>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="text-deep transition-opacity hover:opacity-70"
            >
              <IconButton Icon={User} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>
              {user?.name || user?.email || "My Account"}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link
                href="/profile"
                className="flex cursor-pointer items-center gap-2"
              >
                <UserCircle className="h-4 w-4" />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => void signOut()}
              className="text-terracotta flex cursor-pointer items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </Authenticated>
      <Unauthenticated>
        <Link
          href="/auth"
          className="text-deep flex gap-1 text-sm font-medium transition-colors hover:opacity-70"
        >
          <div className="block sm:hidden">
            <IconButton Icon={User} />
          </div>
          <span className="hidden h-10 w-auto items-center justify-center px-3 sm:flex">
            Log In
          </span>
        </Link>
      </Unauthenticated>
    </>
  );
}
