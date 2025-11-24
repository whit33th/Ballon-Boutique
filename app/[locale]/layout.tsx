import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import "../globals.css";

import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { DM_Sans } from "next/font/google";
import NextTopLoader from "nextjs-toploader";
import { Toaster } from "sonner";
import { Footer, Header } from "@/components/Containers";
import { ConvexProvider } from "@/components/Providers/ConvexProvider";
import AppImageKitProvider from "@/components/Providers/ImageKitProvider";
import { routing } from "@/i18n/routing";
import { getBaseUrl, getDefaultDescription, getSiteName } from "@/SEO";

function getLanguageCode(locale: string): string {
  const localeToLang: Record<string, string> = {
    de: "de-AT", // German as used in Austria
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
  const baseUrl = getBaseUrl();

  return {
    title: {
      default: siteName,
      template: `${siteName} | %s`,
    },
    description,
    metadataBase: new URL(baseUrl),
    other: {
      "apple-mobile-web-app-title": "Ballon Boutique",
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

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const convexDomain = convexUrl ? new URL(convexUrl).origin : null;

  return (
    <html lang={langCode}>
      <head>
        {convexDomain && (
          <link rel="preconnect" href={convexDomain} crossOrigin="anonymous" />
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
        <NextTopLoader
          color="#ff2f00"
          easing="ease"
          shadow="0 0 10px 0 rgba(0, 0, 0, 0.1)"
          height={2}
          showSpinner={false}
        />
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
