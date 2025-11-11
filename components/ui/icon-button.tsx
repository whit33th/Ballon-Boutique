import type { LucideIcon } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";

type IconButtonProps = {
  Icon: LucideIcon;
  ariaLabel: string;
} & ButtonHTMLAttributes<HTMLButtonElement>;

export default function IconButton({
  Icon,
  ariaLabel,
  className,
  ...buttonProps
}: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      className={`text-deep flex h-10 w-10 items-center justify-center rounded-full bg-transparent outline-black/5 backdrop-blur-xs transition-colors hover:bg-black/10 hover:opacity-80 hover:outline ${className ?? ""}`.trim()}
      {...buttonProps}
    >
      <Icon className="h-5 w-5 text-current" aria-hidden="true" />
    </button>
  );
}
