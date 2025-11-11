import { Instagram } from "lucide-react";

export const Footer = () => {
  return (
    <footer className="border-border/50 bg-secondary border-t">
      <div className="container mx-auto px-6 py-4">
        {/* Single row: left = year text, center = palette dots, right = Instagram */}
        <div className="grid grid-cols-3 items-center">
          <p className="text-left text-xs text-white">
            &copy; {new Date().getFullYear()} Ballon Boutique. All rights
            reserved.
          </p>

          <div className="flex justify-center gap-3" aria-hidden="true">
            <span
              className="h-3 w-3 rounded-full"
              style={{ background: "var(--color-light)" }}
            />
            <span
              className="h-3 w-3 rounded-full"
              style={{ background: "var(--color-warm)" }}
            />
            <span
              className="h-3 w-3 rounded-full"
              style={{ background: "var(--color-terracotta)" }}
            />
            <span
              className="h-3 w-3 rounded-full"
              style={{ background: "var(--color-deep)" }}
            />
          </div>

          <a
            href="https://instagram.com"
            target="_blank"
            rel="noopener noreferrer"
            className="justify-self-end text-white transition-colors hover:opacity-80"
            aria-label="Instagram"
          >
            <Instagram className="h-5 w-5" />
          </a>
        </div>
      </div>
    </footer>
  );
};
