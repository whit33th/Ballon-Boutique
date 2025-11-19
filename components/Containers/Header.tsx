"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { Authenticated, Unauthenticated, useMutation } from "convex/react";
import { useQuery } from "convex-helpers/react/cache";

import {
  LogOut,
  ShieldCheck,
  ShoppingBag,
  User,
  UserCircle,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
        src="/imgs/gif/header-hover.webp"
        alt="Premium Balloons Collection"
        width={1000}
        height={56}
        sizes="56px"
        className="absolute inset-0 -z-10 hidden h-full w-full scale-105 object-cover opacity-0 blur contrast-150 transition-opacity duration-400 group-hover:opacity-8 sm:block"
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
          />
          Ballon Boutique
        </Link>
      </nav>
      <div className="flex items-center justify-center"></div>

      <div className="flex items-center gap-0.5 justify-self-end px-1 sm:gap-3 sm:px-3">
        {user?.isAdmin ? (
          <Link href="/admin">
            <IconButton Icon={ShieldCheck} ariaLabel="Admin" />
          </Link>
        ) : null}
        ё
        <AuthAction />
        <Link href="/cart" className="relative">
          <IconButton Icon={ShoppingBag} ariaLabel="Open cart" />
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
              aria-label="Account menu"
              className="text-deep flex h-10 w-10 items-center justify-center rounded-full bg-transparent outline-black/5 backdrop-blur-xs transition-colors hover:bg-black/10 hover:opacity-80 hover:outline"
            >
              <User className="h-5 w-5 text-current" />
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
          <button
            type="button"
            aria-label="Open sign in page"
            className="text-deep flex h-10 w-10 items-center justify-center rounded-full bg-transparent outline-black/5 backdrop-blur-xs transition-colors hover:bg-black/10 hover:opacity-80 hover:outline sm:hidden"
          >
            <User className="h-5 w-5 text-current" />
          </button>
          <span className="border-deep hidden h-10 w-auto items-center justify-center rounded-lg border-2 px-3 sm:flex">
            Log In
          </span>
        </Link>
      </Unauthenticated>
    </>
  );
}
