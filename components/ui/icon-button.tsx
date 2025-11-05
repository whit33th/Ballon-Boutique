import type { LucideIcon } from "lucide-react";

export default function IconButton({ Icon }: { Icon: LucideIcon }) {
  return (
    <button
      type="button"
      className="text-deep flex h-10 w-10 items-center justify-center rounded-full bg-transparent outline-black/5 backdrop-blur-xs transition-colors hover:bg-black/10 hover:opacity-80 hover:outline"
    >
      <Icon className="h-5 w-5 text-current" />
    </button>
  );
}
