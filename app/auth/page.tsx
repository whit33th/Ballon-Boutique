"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import { ConvexError } from "convex/values";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function AuthPage() {
  const { isAuthenticated } = useConvexAuth();
  const { signIn } = useAuthActions();

  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [submitting, setSubmitting] = useState(false);

  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/");
    }
  }, [isAuthenticated, router]);

  return (
    <main className="bg-primary flex min-h-screen items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg sm:p-8">
        <h1 className="text-deep mb-2 text-xl font-semibold sm:text-2xl">
          {flow === "signIn" ? "Sign in" : "Create account"}
        </h1>
        <p className="text-deep/70 mb-6 text-sm">
          {flow === "signIn"
            ? "Welcome back — enter your email and password to sign in."
            : "Create a new account to start shopping."}
        </p>

        <form
          className="flex flex-col"
          onSubmit={async (event) => {
            event.preventDefault();
            setSubmitting(true);
            const formData = new FormData(event.currentTarget);

            await signIn("password", formData)
              .then(() => {
                const email = formData.get("email") as string | null;
                toast.success(`Signed in${email ? ` as ${email}` : ""}`);
              })
              .catch((error) => {
                console.error(error);
                let message = "Something went wrong. Please try again.";
                if (error instanceof ConvexError) {
                  const errorData = error.data;
                  if (typeof errorData === "string" && errorData.length > 0) {
                    message = errorData;
                  }
                }
                toast.error(message);
              })
              .finally(() => setSubmitting(false));
          }}
        >
          <label
            htmlFor="email"
            className="text-deep text-xs font-medium sm:text-sm"
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="focus:ring-secondary focus:border-secondary mt-1 mb-4 block w-full rounded-lg border px-3 py-2 text-base shadow-sm focus:ring-2 focus:outline-none"
          />

          <div className="flex items-center justify-between">
            <label
              htmlFor="password"
              className="text-deep text-xs font-medium sm:text-sm"
            >
              Password
            </label>
            {flow === "signIn" ? (
              <button
                type="button"
                onClick={() =>
                  toast(
                    "Password reset is supported via email — enter your email and click Reset below.",
                  )
                }
                className="text-secondary text-xs hover:underline sm:text-sm"
              >
                Forgot?
              </button>
            ) : null}
          </div>

          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete={
              flow === "signIn" ? "current-password" : "new-password"
            }
            className="focus:ring-secondary focus:border-secondary mt-1 mb-2 block w-full rounded-lg border px-3 py-2 text-base shadow-sm focus:ring-2 focus:outline-none"
          />

          <input name="flow" value={flow} type="hidden" />

          <button
            type="submit"
            disabled={submitting}
            className="btn-accent mt-4 inline-flex items-center justify-center rounded-lg px-4 py-2 font-semibold transition-opacity hover:opacity-90 disabled:opacity-60 sm:text-base"
          >
            {submitting
              ? "Working..."
              : flow === "signIn"
                ? "Sign in"
                : "Sign up"}
          </button>

          <button
            type="button"
            onClick={() => setFlow(flow === "signIn" ? "signUp" : "signIn")}
            className="text-deep/70 hover:text-deep mt-3 text-xs hover:underline sm:text-sm"
          >
            {flow === "signIn"
              ? "Don't have an account? Sign up"
              : "Already have an account? Sign in"}
          </button>
        </form>

        <hr className="border-secondary/20 my-6" />

        <p className="text-deep/70 text-center text-xs sm:text-sm">
          Or sign in with a provider (coming soon)
        </p>
      </div>
    </main>
  );
}
