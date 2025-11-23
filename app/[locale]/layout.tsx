import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import "../globals.css";

import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { DM_Sans } from "next/font/google";
import { Toaster } from "sonner";
import { Footer, Header } from "@/components/Containers";
import { ConvexProvider } from "@/components/Providers/ConvexProvider";
import AppImageKitProvider from "@/components/Providers/ImageKitProvider";
import { routing } from "@/i18n/routing";
import { getDefaultDescription, getSiteName } from "@/SEO";

/**
 * Maps routing locale codes to valid BCP 47 language codes
 * for the HTML lang attribute
 */
function getLanguageCode(locale: string): string {
  const localeToLang: Record<string, string> = {
    de: "de-AT", // German as used in Austria (RFC 5646)
    en: "en",
    uk: "uk",
    ru: "ru",
  };
  return localeToLang[locale] || locale;
}

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  preload: true,
  display: "swap",
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const siteName = getSiteName();
  const description = getDefaultDescription(locale);

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const convexDomain = convexUrl ? new URL(convexUrl).origin : null;
  const imageKitDomain = "https://ik.imagekit.io";

  return {
    title: {
      default: siteName,
      template: `${siteName} | %s`,
    },
    description,
    metadataBase: new URL(
      process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
    ),
    other: {
      ...(convexDomain && {
        "preconnect-convex": convexDomain,
      }),
      "preconnect-imagekit": imageKitDomain,
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  const messages = await getMessages();
  const langCode = getLanguageCode(locale);

  return (
    <html lang={langCode}>
      <head>
        <meta name="apple-mobile-web-app-title" content="Ballon Boutique" />
        {process.env.NEXT_PUBLIC_CONVEX_URL && (
          <link
            rel="preconnect"
            href={new URL(process.env.NEXT_PUBLIC_CONVEX_URL).origin}
            crossOrigin="anonymous"
          />
        )}
        <link
          rel="preconnect"
          href="https://ik.imagekit.io"
          crossOrigin="anonymous"
        />
        <link rel="dns-prefetch" href="https://lh3.googleusercontent.com" />
        <link rel="dns-prefetch" href="https://lottie.host" />
      </head>
      <body
        className={`${dmSans.variable} relative flex min-h-screen w-full flex-col overflow-x-hidden antialiased`}
      >
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ConvexAuthNextjsServerProvider>
            <ConvexProvider>
              <AppImageKitProvider>
                <Header />
                <main className="flex h-full w-full flex-1 flex-col">
                  {children}
                </main>
                <Footer />

                <Toaster richColors position="bottom-right" />
              </AppImageKitProvider>
            </ConvexProvider>
          </ConvexAuthNextjsServerProvider>
        </NextIntlClientProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
