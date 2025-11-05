"use client";

import { useAuthActions } from "@convex-dev/auth/react";

export function SignOutButton({ className = "" }: { className?: string }) {
  const { signOut } = useAuthActions();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Failed to sign out:", error);
    }
  };

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className={`inline-flex h-11 items-center justify-center rounded-full border border-black px-5 text-xs font-semibold tracking-[0.25rem] text-black uppercase transition hover:bg-black hover:text-white ${className}`}
    >
      Sign out
    </button>
  );
}
