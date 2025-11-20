export const palette = {
  softBorder: "border-[rgba(var(--deep-rgb),0.12)]",
  subtleBorder: "border-[rgba(var(--deep-rgb),0.08)]",
  mutedText: "text-[rgba(var(--deep-rgb),0.65)]",
  subtleText: "text-[rgba(var(--deep-rgb),0.5)]",
  elevatedSurface: "bg-white/95",
  softSurface: "bg-[rgba(var(--primary-rgb),0.35)]",
  accentSurface: "bg-[rgba(var(--secondary-rgb),0.15)]",
  warmSurface: "bg-[rgba(var(--support-warm-rgb),0.22)]",
} as const;

export const fieldLabelClass = `flex flex-col gap-2 text-sm ${palette.mutedText}`;
export const fieldInputClass = `h-12 rounded-2xl border px-4 font-medium text-deep transition outline-none focus:border-[var(--accent)] bg-white/95 ${palette.softBorder}`;
export const fieldTextareaClass = `rounded-2xl border px-4 py-3 font-medium text-deep transition outline-none focus:border-[var(--accent)] bg-white/95 ${palette.softBorder}`;
