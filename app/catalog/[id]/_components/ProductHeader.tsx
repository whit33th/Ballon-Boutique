"use client";

import { useRouter } from "next/navigation";
import { memo } from "react";

export const ProductHeader = memo(function ProductHeader() {
  const router = useRouter();
  return (
    <div className="border-border text-deep/60 flex items-center justify-between border-b px-6 py-5 text-xs font-semibold tracking-wider uppercase">
      <button
        type="button"
        onClick={() => router.back()}
        className="text-deep hover:text-secondary flex items-center gap-2 transition-colors"
      >
        ← Back
      </button>
      <span className="text-deep/40">Premium Collection</span>
    </div>
  );
});
