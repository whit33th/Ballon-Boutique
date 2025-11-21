"use client";

import { Facebook, Home, Instagram, Mail, ShoppingBag } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { STORE_INFO } from "@/constants/config";
import "./globals.css";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="bg-background flex min-h-[calc(100vh-56px)] items-center justify-center px-4 antialiased">
      <div className="w-full max-w-2xl text-center">
        {/* Decorative illustration */}
        <div className="flex justify-center">
          <motion.iframe
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            title="Error Animation"
            src="https://lottie.host/embed/b4444d46-e071-4362-b15b-a61ef26db90b/4aJCIOGIGm.lottie"
          />
        </div>

        {/* Heading */}
        <h1 className="text-foreground mb-4 text-4xl font-bold text-balance md:text-5xl">
          Something went wrong
        </h1>

        {/* Description */}
        <p className="text-muted-foreground mx-auto mb-8 max-w-md text-lg leading-relaxed text-pretty">
          Sorry — something went wrong on our end. We're working on it. Please
          try again in a few moments or reach out if the problem persists.
        </p>

        {/* Action buttons */}
        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button size="lg" className="min-w-40" onClick={() => reset()}>
            Try again
          </Button>
          <Button asChild size="lg" className="min-w-40">
            <Link href="/">
              <Home className="mr-2 h-5 w-5" />
              Back to Home
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="min-w-40 bg-transparent"
          >
            <Link href="/catalog">
              <ShoppingBag className="mr-2 h-5 w-5" />
              Browse Catalog
            </Link>
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
  );
}
