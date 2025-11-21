"use client";

import { Camera, Loader2, UserRound } from "lucide-react";
import Image from "next/image";
import type { ChangeEvent, RefObject } from "react";
import { SignOutButton } from "@/components/SignOutButton";
import { palette } from "./palette";

type AvatarPanelProps = {
  user: {
    _id: string;
    name?: string;
    email?: string;
    phone?: string;
    address?:
      | string
      | {
          streetAddress: string;
          city: string;
          postalCode: string;
          deliveryNotes: string;
        };
    isAdmin?: boolean;
    image?: string;
    imageFileId?: string;
  };
  formattedOrdersCount: number;
  isUploadingAvatar: boolean;
  avatarInputRef: RefObject<HTMLInputElement | null>;
  onAvatarFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  avatarUrl?: string | null;
};

export function AvatarPanel({
  user,
  isUploadingAvatar,
  avatarInputRef,
  onAvatarFileChange,
  avatarUrl,
}: AvatarPanelProps) {
  const resolvedAvatar = avatarUrl ?? null;

  return (
    <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="group relative h-28 w-28 shrink-0 drop-shadow-lg">
          {resolvedAvatar ? (
            <div>
              <Image
                src={resolvedAvatar}
                alt={`Avatar of ${user.name ?? "customer"}`}
                fill
                sizes="112px"
                className="z-10 scale-95 rounded-full object-cover"
                priority
              />
              <Image
                src={resolvedAvatar}
                alt={`Avatar of ${user.name ?? "customer"}`}
                fill
                sizes="112px"
                className="animate-[spin_3s_linear_infinite] rounded-full object-cover invert"
                priority
              />
            </div>
          ) : (
            <div className="bg-background/70 flex h-full w-full items-center justify-center rounded-full">
              <UserRound className="text-secondary h-10 w-10" />
            </div>
          )}
          <label
            aria-label="Change avatar"
            className={`absolute inset-0 z-40 flex cursor-pointer items-center justify-center rounded-full bg-[rgba(var(--deep-rgb),0.14)] ${
              isUploadingAvatar
                ? "pointer-events-none opacity-100"
                : "pointer-events-auto opacity-0 group-hover:opacity-100"
            }`}
          >
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="z-50 hidden"
              onChange={onAvatarFileChange}
              disabled={isUploadingAvatar}
            />
            {isUploadingAvatar ? (
              <Loader2 className="animate-spin text-white" size={20} />
            ) : (
              <Camera className="text-white" size={20} />
            )}
          </label>
        </div>
        <div className="space-y-2">
          <p
            className={`text-xs tracking-[0.2rem] uppercase ${palette.subtleText}`}
          >
            Welcome back
          </p>
          <h1 className="text-deep text-4xl font-semibold">
            {user.name ?? "Balloon Lover"}
          </h1>
          <p className={`text-sm ${palette.mutedText}`}>{user.email}</p>
        </div>
      </div>
      <SignOutButton />
    </div>
  );
}
