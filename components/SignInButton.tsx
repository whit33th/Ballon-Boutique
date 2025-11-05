"use client";

import { useAuthActions } from "@convex-dev/auth/react";

export function SignInButton() {
  const { signIn } = useAuthActions();

  return (
    <button
      type="submit"
      onClick={() => {
        void signIn("password");
      }}
    >
      Sign in
    </button>
  );
}
