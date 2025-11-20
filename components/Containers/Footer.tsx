import { Facebook, Instagram } from "lucide-react";
import Link from "next/link";

import { STORE_INFO, WHATSAPP_NUMBER } from "@/constants/config";

type InternalLink = {
  label: string;
  href: { pathname: string };
};

type ExternalLink = {
  label: string;
  href: string;
  external: true;
};

type FooterSection = {
  title: string;
  links: Array<InternalLink | ExternalLink>;
};

const sections: FooterSection[] = [
  {
    title: "Shop",
    links: [
      { label: "Home", href: { pathname: "/" as const } },
      { label: "Catalog", href: { pathname: "/catalog" as const } },
      { label: "Cart", href: { pathname: "/cart" as const } },
      { label: "Checkout", href: { pathname: "/checkout" as const } },
    ],
  },
  {
    title: "Customer Care",
    links: [
      {
        label: "Delivery & Pickup",
        href: { pathname: "/delivery" as const },
      },
      {
        label: "My Orders",
        href: { pathname: "/profile" as const },
      },
      {
        label: "WhatsApp",
        href: `https://wa.me/${WHATSAPP_NUMBER}`,
        external: true,
      },
    ],
  },
  {
    title: "Company",
    links: [
      {
        label: "Imprint",
        href: { pathname: "/legal/imprint" as const },
      },
      {
        label: "Terms & Conditions",
        href: { pathname: "/legal/terms" as const },
      },
      {
        label: "Privacy Policy",
        href: { pathname: "/legal/privacy" as const },
      },
      {
        label: "Cancellation Policy",
        href: { pathname: "/legal/cancellation" as const },
      },
    ],
  },
  {
    title: "Social",
    links: [
      {
        label: "Instagram",
        href: STORE_INFO.social.instagram,
        external: true,
      },
      {
        label: "Facebook",
        href: STORE_INFO.social.facebook,
        external: true,
      },
    ],
  },
];

const legalLinks: InternalLink[] = [
  { label: "Terms & Conditions", href: { pathname: "/legal/terms" as const } },
  { label: "Privacy Policy", href: { pathname: "/legal/privacy" as const } },
  {
    label: "Cancellation Policy",
    href: { pathname: "/legal/cancellation" as const },
  },
  { label: "Imprint", href: { pathname: "/legal/imprint" as const } },
];

export const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="border-border/40 bg-secondary border-t text-white">
      <div className="container mx-auto px-6 py-8">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            <Link
              href={{ pathname: "/" }}
              className="text-xl font-semibold tracking-tight text-white"
            >
              {STORE_INFO.name}
            </Link>
            <p className="max-w-sm text-sm text-white/75">
              Bespoke balloon decor delivered across Styria, crafted for moments
              that linger long after the last guest leaves.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {/* <div className="flex items-center gap-2" aria-hidden="true">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: "var(--color-light)" }}
                />
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: "var(--color-warm)" }}
                />
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: "var(--color-terracotta)" }}
                />
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: "var(--color-deep)" }}
                />
              </div> */}

              <a
                href={STORE_INFO.social.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center transition-opacity hover:opacity-80"
                aria-label="Instagram profile"
              >
                <Instagram className="size-5" />
              </a>
              <a
                href={STORE_INFO.social.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center transition-opacity hover:opacity-80"
                aria-label="Facebook profile"
              >
                <Facebook className="size-5" />
              </a>
              <a
                href={`mailto:${STORE_INFO.contact.email}`}
                className="flex items-center transition-opacity hover:opacity-80"
                aria-label="Email"
              >
                {STORE_INFO.contact.email}
              </a>
            </div>
          </div>

          <div className="flex flex-col gap-6 text-sm text-white/75 lg:flex-row lg:items-start lg:gap-10">
            {sections.map((section) => (
              <div key={section.title} className="min-w-[140px] space-y-3">
                <p className="text-xs font-semibold tracking-[0.18em] text-white/60 uppercase">
                  {section.title}
                </p>
                <ul className="space-y-1.5">
                  {section.links.map((link) => {
                    if ("external" in link) {
                      return (
                        <li key={link.label}>
                          <a
                            href={link.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="transition-opacity hover:opacity-80"
                          >
                            {link.label}
                          </a>
                        </li>
                      );
                    }

                    return (
                      <li key={link.label}>
                        <Link
                          href={link.href}
                          className="transition-opacity hover:opacity-80"
                        >
                          {link.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 border-t border-white/10 pt-4 text-xs text-white/60">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <p>
              &copy; {year} {STORE_INFO.name}. All rights reserved.
            </p>
            <nav className="flex flex-wrap gap-x-5 gap-y-2">
              {legalLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="transition-opacity hover:opacity-80"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </div>
    </footer>
  );
};
