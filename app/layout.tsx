import type { Metadata } from "next";
import "./globals.css";

import { DM_Sans } from "next/font/google";
import { Toaster } from "sonner";
import { Footer, Header } from "@/components/Containers";
import { ConvexProvider } from "@/components/Providers/ConvexProvider";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Balloon Shop",
  description: "Beautiful balloons for every occasion",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${dmSans.variable} relative flex min-h-screen w-full flex-col overflow-x-hidden antialiased`}
      >
        <ConvexProvider>
          {/* <div className="absolute top-0 left-0 h-full w-40 bg-linear-to-r from-black/15 to-transparent"></div>
          <div className="absolute top-0 right-0 h-full w-40 bg-linear-to-l from-black/15 to-transparent"></div> */}

          {/* <div className="border-b py-1 text-center text-sm font-medium backdrop-blur-2xl">
            New pieces added daily
          </div> */}
          <Header />
          <main className="flex h-full w-full flex-1 flex-col">{children}</main>
          <Footer />

          <Toaster richColors position="bottom-right" />
        </ConvexProvider>
      </body>
    </html>
  );
}
