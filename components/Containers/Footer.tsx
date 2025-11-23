"use client";

import { Facebook, Instagram } from "lucide-react";
import { useTranslations } from "next-intl";
import { STORE_INFO, WHATSAPP_NUMBER } from "@/constants/config";
import { Link } from "@/i18n/routing";

type InternalLink = {
  labelKey: string;
  href: string;
};

type ExternalLink = {
  labelKey: string;
  href: string;
  external: true;
};

type FooterSection = {
  titleKey: string;
  links: Array<InternalLink | ExternalLink>;
};

const sections: FooterSection[] = [
  {
    titleKey: "footer.shop",
    links: [
      { labelKey: "footer.home", href: "/" },
      { labelKey: "footer.catalog", href: "/catalog" },
      { labelKey: "footer.cart", href: "/cart" },
      { labelKey: "footer.checkout", href: "/checkout" },
    ],
  },
  {
    titleKey: "footer.customerCare",
    links: [
      {
        labelKey: "footer.whatsapp",
        href: `https://wa.me/${WHATSAPP_NUMBER}`,
        external: true,
      },
      {
        labelKey: "footer.email",
        href: `mailto:${STORE_INFO.contact.email}`,
      },
      {
        labelKey: "footer.phone",
        href: `tel:${STORE_INFO.contact.phone}`,
      },
    ],
  },
  // {
  //   titleKey: "footer.company",
  //   links: [
  //     {
  //       labelKey: "footer.imprint",
  //       href: "/legal/imprint",
  //     },
  //     {
  //       labelKey: "footer.terms",
  //       href: "/legal/terms",
  //     },
  //     {
  //       labelKey: "footer.privacy",
  //       href: "/legal/privacy",
  //     },
  //
  //   ],
  // },
  {
    titleKey: "footer.social",
    links: [
      {
        labelKey: "footer.instagram",
        href: STORE_INFO.social.instagram,
        external: true,
      },
      {
        labelKey: "footer.facebook",
        href: STORE_INFO.social.facebook,
        external: true,
      },
    ],
  },
];

const legalLinks: InternalLink[] = [
  { labelKey: "footer.terms", href: "/legal/terms" },
  { labelKey: "footer.privacy", href: "/legal/privacy" },
  { labelKey: "footer.imprint", href: "/legal/imprint" },
];

// Популярные ссылки, для которых нужен prefetch
const popularLinks = new Set(["/", "/catalog", "/cart", "/profile"]);

const shouldPrefetch = (href: string): boolean => {
  return popularLinks.has(href);
};

export const Footer = () => {
  const t = useTranslations();
  const year = new Date().getFullYear();

  return (
    <footer className="border-border/40 bg-secondary border-t text-white">
      <div className="container mx-auto px-6 py-8">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            <Link
              href="/"
              prefetch={true}
              className="text-xl font-semibold tracking-tight text-white"
            >
              {t("store.name")}
            </Link>
            <p className="max-w-sm text-sm text-white/90">
              {t("footer.description")}
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

          <div className="flex flex-col gap-6 text-sm text-white/90 lg:flex-row lg:items-start lg:gap-10">
            {sections.map((section) => (
              <div key={section.titleKey} className="min-w-[140px] space-y-3">
                <p className="text-xs font-semibold tracking-[0.18em] text-white/85 uppercase">
                  {t(section.titleKey)}
                </p>
                <ul className="space-y-1.5">
                  {section.links.map((link) => {
                    if ("external" in link) {
                      return (
                        <li key={link.labelKey}>
                          <a
                            href={link.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="transition-opacity hover:opacity-80"
                          >
                            {t(link.labelKey)}
                          </a>
                        </li>
                      );
                    }

                    return (
                      <li key={link.labelKey}>
                        <Link
                          href={link.href}
                          prefetch={shouldPrefetch(link.href)}
                          className="transition-opacity hover:opacity-80"
                        >
                          {t(link.labelKey)}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 border-t border-white/10 pt-4 text-xs text-white/85">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <p>
              &copy; {year} {t("store.name")}. {t("footer.allRightsReserved")}
            </p>
            <nav className="flex flex-wrap gap-x-5 gap-y-2">
              {legalLinks.map((link) => (
                <Link
                  key={link.labelKey}
                  href={link.href}
                  prefetch={false}
                  className="transition-opacity hover:opacity-80"
                >
                  {t(link.labelKey)}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </div>
    </footer>
  );
};
