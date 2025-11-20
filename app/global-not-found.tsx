import { Facebook, Home, Instagram, Mail, ShoppingBag } from "lucide-react";
import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import { Button } from "@/components/ui/button";
import { STORE_INFO } from "@/constants/config";
import "./globals.css";

const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans" });

export const metadata: Metadata = {
  title: "404 - Page Not Found",
  description: "The page you are looking for does not exist.",
};

export default function GlobalNotFound() {
  return (
    <html lang="en" className={dmSans.className}>
      <body className="min-h-screen bg-white antialiased">
        <div className="bg-background flex min-h-screen items-center justify-center px-4">
          <div className="w-full max-w-2xl text-center">
            {/* Decorative illustration */}
            <div className="flex justify-center">
              <iframe
                title="Cat Error"
                src="https://lottie.host/embed/b4444d46-e071-4362-b15b-a61ef26db90b/4aJCIOGIGm.lottie"
              />
            </div>

            {/* Heading */}
            <h1 className="text-foreground mb-4 text-4xl font-bold text-balance md:text-5xl">
              Page Not Found
            </h1>

            {/* Description */}
            <p className="text-muted-foreground mx-auto mb-8 max-w-md text-lg leading-relaxed text-pretty">
              Oops! This page seems to have floated away. Let's get you back to
              celebrating special moments.
            </p>

            {/* Action buttons */}
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button asChild size="lg" className="min-w-40">
                <a href="/">
                  <Home className="mr-2 h-5 w-5" />
                  Back to Home
                </a>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="min-w-40 bg-transparent"
              >
                <a href="/catalog">
                  <ShoppingBag className="mr-2 h-5 w-5" />
                  Browse Catalog
                </a>
              </Button>
            </div>

            {/* Additional help */}
            <div className="border-border mt-12 border-t pt-8">
              <p className="text-muted-foreground mb-4 text-sm">
                Need help? Get in touch with us
              </p>
              <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button asChild variant="ghost" size="sm">
                  <a href={`mailto:${STORE_INFO.contact.email}`}>
                    <Mail className="mr-2 h-4 w-4" />
                    Email us
                  </a>
                </Button>
                <Button asChild variant="ghost" size="sm">
                  <a
                    href={STORE_INFO.social.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Instagram className="mr-2 h-4 w-4" />
                    Instagram
                  </a>
                </Button>
                <Button asChild variant="ghost" size="sm">
                  <a
                    href={STORE_INFO.social.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Facebook className="mr-2 h-4 w-4" />
                    Facebook
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
