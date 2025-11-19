import type { Metadata } from "next";
import "./globals.css";

import { DM_Sans } from "next/font/google";
import { Toaster } from "sonner";
import { Footer, Header } from "@/components/Containers";
import { ConvexProvider } from "@/components/Providers/ConvexProvider";
import AppImageKitProvider from "@/components/Providers/ImageKitProvider";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ballon Boutique",
  description: "Balloons for every occasion. When moments - become memories.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="apple-mobile-web-app-title" content="Ballon Boutique" />
      </head>
      <body
        className={`${dmSans.variable} relative flex min-h-screen w-full flex-col overflow-x-hidden antialiased`}
      >
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
      </body>
    </html>
  );
}
