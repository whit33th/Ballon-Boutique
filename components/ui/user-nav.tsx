"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex-helpers/react/cache";
import { History, LogOut, User } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api } from "@/convex/_generated/api";
import { useConvexAvatarStorage } from "@/hooks/useConvexAvatarStorage";

interface UserNavProps {
  user?: {
    name?: string;
    email?: string;
    imageFileId?: string;
    image?: string;
  };
}

export function UserNav({ user }: UserNavProps) {
  const queriedUser = useQuery(api.auth.loggedInUser);
  const currentUser = user ?? queriedUser;

  const userInitials = currentUser?.name
    ? currentUser.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : null;

  const avatarUrlFromRecord = currentUser?.image ?? null;
  const { avatarUrl: avatarUrlFromStorage } = useConvexAvatarStorage(
    currentUser?.imageFileId ?? null,
  );
  const avatarUrl = avatarUrlFromRecord ?? avatarUrlFromStorage;
  const { signOut } = useAuthActions();

  return (
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
      <DropdownMenuContent
        className="border-foreground/15 w-80 border p-0"
        align="end"
        forceMount
      >
        {/* User Profile Header */}
        <div className="rounded-md border-b bg-linear-to-br from-[#F5F1ED] to-[#EDE7E1] p-4">
          <div className="flex items-center gap-3">
            {avatarUrl ? (
              <div className="group relative h-12 w-12 shrink-0 drop-shadow-lg">
                <div>
                  <Image
                    src={avatarUrl}
                    alt={currentUser?.name || "User"}
                    fill
                    sizes="48px"
                    className="z-10 scale-95 rounded-full object-cover"
                  />
                  <Image
                    src={avatarUrl}
                    alt={currentUser?.name || "User"}
                    fill
                    sizes="48px"
                    className="animate-[spin_3s_linear_infinite] rounded-full object-cover invert"
                  />
                </div>
              </div>
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-linear-to-br from-[#D4A574] to-[#E8C4A0] text-lg font-semibold text-white">
                {userInitials ?? <User className="h-6 w-6" />}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[#2D2A27]">
                {currentUser?.name || "Balloon Lover"}
              </p>
              <p className="truncate text-xs text-[#6B6662]">
                {currentUser?.email || "guest@example.com"}
              </p>
            </div>
          </div>
        </div>

        {/* Account Section */}
        <div className="p-2">
          <DropdownMenuLabel className="px-2 py-2 text-xs font-semibold tracking-wide text-[#8B7F76] uppercase">
            Account
          </DropdownMenuLabel>
          <div className="space-y-1">
            <DropdownMenuItem asChild>
              <Link
                href="/profile"
                className="group cursor-pointer rounded-lg px-3 py-2.5 transition-colors hover:bg-[#F5F1ED]"
              >
                <div className="flex w-full items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-lg border border-[#D4A574]/20 bg-linear-to-br from-[#D4A574]/10 to-[#E8C4A0]/10">
                    <User className="size-4 text-[#D4A574]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-deep group-hover:text-background text-sm font-medium transition-colors">
                      Profile
                    </p>
                    <p className="text-deep/60 group-hover:text-background text-xs transition-colors">
                      View and edit profile
                    </p>
                  </div>
                </div>
              </Link>
            </DropdownMenuItem>

            <DropdownMenuItem asChild>
              <Link
                href="/profile?tab=orders"
                className="group cursor-pointer rounded-lg px-3 py-2.5 transition-colors hover:bg-[#F5F1ED]"
              >
                <div className="flex w-full items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-lg border border-[#D4A574]/20 bg-linear-to-br from-[#D4A574]/10 to-[#E8C4A0]/10">
                    <History className="size-4 text-[#D4A574]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-deep group-hover:text-background text-sm font-medium transition-colors">
                      Orders
                    </p>
                    <p className="text-deep/60 group-hover:text-background text-xs transition-colors">
                      Track your orders
                    </p>
                  </div>
                </div>
              </Link>
            </DropdownMenuItem>

            {/* <DropdownMenuItem asChild>
              <Link
                href="/profile"
                className="group cursor-pointer rounded-lg px-3 py-2.5 transition-colors hover:bg-[#F5F1ED]"
              >
                <div className="flex w-full items-center gap-3">
                  <div className="flex size-9 items-center justify-center rounded-lg border border-[#D4A574]/20 bg-linear-to-br from-[#D4A574]/10 to-[#E8C4A0]/10">
                    <Heart className="size-4 text-[#D4A574]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-deep group-hover:text-background text-sm font-medium transition-colors">
                      Wishlist
                    </p>
                    <p className="text-deep/60 group-hover:text-background text-xs transition-colors">
                      Saved items
                    </p>
                  </div>
                </div>
              </Link>
            </DropdownMenuItem> */}
          </div>
        </div>

        <DropdownMenuSeparator className="my-0" />

        {/* Settings Section */}
        {/* <div className="p-2">
          <DropdownMenuLabel className="px-2 py-2 text-xs font-semibold tracking-wide text-[#8B7F76] uppercase">
            Settings
          </DropdownMenuLabel>
          <div className="space-y-1">
            <DropdownMenuItem className="group cursor-pointer rounded-lg px-3 py-2.5 transition-colors hover:bg-[#F5F1ED]">
              <div className="flex w-full items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-lg border border-[#D4A574]/20 bg-linear-to-br from-[#D4A574]/10 to-[#E8C4A0]/10">
                  <Settings className="size-4 text-[#D4A574]" />
                </div>
                <div className="flex-1">
                  <p className="text-deep group-hover:text-background text-sm font-medium transition-colors">
                    Preferences
                  </p>
                  <p className="text-deep/60 group-hover:text-background text-xs transition-colors">
                    Manage settings
                  </p>
                </div>
              </div>
            </DropdownMenuItem>

            <DropdownMenuItem className="group cursor-pointer rounded-lg px-3 py-2.5 transition-colors hover:bg-[#F5F1ED]">
              <div className="flex w-full items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-lg border border-[#D4A574]/20 bg-linear-to-br from-[#D4A574]/10 to-[#E8C4A0]/10">
                  <Bell className="size-4 text-[#D4A574]" />
                </div>
                <div className="flex-1">
                  <p className="text-deep group-hover:text-background text-sm font-medium transition-colors">
                    Notifications
                  </p>
                  <p className="text-deep/60 group-hover:text-background text-xs transition-colors">
                    Manage alerts
                  </p>
                </div>
              </div>
            </DropdownMenuItem>
          </div>
        </div> */}

        <DropdownMenuSeparator className="my-1" />

        {/* Logout */}
        <div className="p-2">
          <DropdownMenuItem
            className="cursor-pointer rounded-lg px-3 py-2.5 transition-colors hover:bg-red-50 focus:bg-red-50"
            onClick={() => void signOut()}
          >
            <div className="flex w-full items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg border border-red-100 bg-red-50">
                <LogOut className="size-4 text-red-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-red-600">Log out</p>
                <p className="text-xs text-red-500/70">Sign out of account</p>
              </div>
            </div>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
