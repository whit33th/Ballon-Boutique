import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type ResultTone = "success" | "error";

type CheckoutResultShellProps = {
  tone: ResultTone;
  badge: string;
  title: string;
  description: string;
  icon: ReactNode;
  highlight?: ReactNode;
  children?: ReactNode;
};

export function CheckoutResultShell({
  tone,
  badge,
  title,
  description,
  icon,
  highlight,
  children,
}: CheckoutResultShellProps) {
  const toneClasses =
    tone === "success" ? "text-green-600 bg-white/90" : "text-red-600 bg-white";
  const accentClasses =
    tone === "success"
      ? "bg-secondary/10 text-secondary"
      : "bg-red-50 text-red-700";

  return (
    <div className="bg-primary min-h-screen">
      <main className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-3xl space-y-6">
          <div className="overflow-hidden rounded-3xl bg-white/95 shadow-lg ring-1 ring-black/5">
            <div className={cn("p-6 text-center sm:p-10", accentClasses)}>
              <div className="mb-3 flex items-center justify-center">
                <span className="text-5xl sm:text-6xl">{icon}</span>
              </div>
              <span className="text-xs font-semibold tracking-[0.2em] uppercase">
                {badge}
              </span>
              <h1 className="mt-3 text-2xl font-semibold text-gray-900 sm:text-3xl">
                {title}
              </h1>
              <p className="mt-1 text-gray-600">{description}</p>
              {highlight}
            </div>
            <div className={cn("p-6 sm:p-8", toneClasses)}>{children}</div>
          </div>
        </div>
      </main>
    </div>
  );
}

export function CheckoutResultSkeleton() {
  return (
    <div className="bg-primary min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-3xl animate-pulse space-y-4">
          <div className="h-64 rounded-3xl bg-white/80" />
        </div>
      </div>
    </div>
  );
}
