"use client";

import { useAuthActions } from "@convex-dev/auth/react";

export function SignInButton() {
  const { signIn } = useAuthActions();

  return (
    <button
      type="submit"
      onClick={() => {
        // New Convex API expects a `flow` first (e.g. "signIn")
        void signIn("signIn");
      }}
    >
      Sign in
    </button>
  );
}
