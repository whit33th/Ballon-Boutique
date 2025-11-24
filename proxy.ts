import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";
import { type NextRequest, NextResponse } from "next/server";
import type { Locale } from "next-intl";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { isSupportedLocale } from "./i18n/utils";

const isAuthPage = createRouteMatcher(["/auth(.*)", "/signin", "/signup"]);
const isProtectedRoute = createRouteMatcher(["/admin(.*)", "/profile(.*)"]);

const intlMiddleware = createMiddleware(routing);

export default convexAuthNextjsMiddleware(
  async (request, { convexAuth }) => {
    const { pathname } = request.nextUrl;

    if (pathname.startsWith("/api/")) {
      const isProtectedApiRoute =
        pathname.startsWith("/api/imagekit-") ||
        pathname.startsWith("/api/admin");

      if (isProtectedApiRoute && !(await convexAuth.isAuthenticated())) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      return NextResponse.next();
    }

    if (
      pathname === "/sitemap.xml" ||
      pathname.startsWith("/sitemap/") ||
      pathname === "/robots.txt" ||
      pathname === "/manifest.json" ||
      pathname === "/manifest.webmanifest"
    ) {
      return NextResponse.next();
    }

    const savedLocale = request.cookies.get("NEXT_LOCALE")?.value;

    if (pathname === "/" && isSupportedLocale(savedLocale)) {
      const url = request.nextUrl.clone();
      url.pathname = `/${savedLocale}`;
      return NextResponse.redirect(url);
    }

    const intlResponse = intlMiddleware(request);

    if (intlResponse instanceof NextResponse && intlResponse.status === 307) {
      return intlResponse;
    }

    const localeMatch = pathname.match(/^\/(de|en|uk|ru)(\/|$)/);
    const locale = localeMatch
      ? (localeMatch[1] as Locale)
      : routing.defaultLocale;
    const pathWithoutLocale = locale
      ? pathname.replace(`/${locale}`, "") || "/"
      : pathname;

    if (
      isAuthPage({ nextUrl: { pathname: pathWithoutLocale } } as NextRequest) &&
      (await convexAuth.isAuthenticated())
    ) {
      const redirectPath = isSupportedLocale(savedLocale)
        ? `/${savedLocale}`
        : "/";

      return nextjsMiddlewareRedirect(request, redirectPath);
    }

    if (
      isProtectedRoute({
        nextUrl: { pathname: pathWithoutLocale },
      } as NextRequest) &&
      !(await convexAuth.isAuthenticated())
    ) {
      const redirectPath = locale ? `/${locale}/auth` : "/auth";
      return nextjsMiddlewareRedirect(request, redirectPath);
    }

    return intlResponse;
  },
  { cookieConfig: { maxAge: 60 * 60 * 24 * 7 }, verbose: true },
);

export const config = {
  matcher: [
    "/((?!.*\\..*|_next).*)",
    "/",
    "/(api|trpc)(.*)",
    "/(manifest.json|manifest.webmanifest)",
    "/robots.txt",
  ],
};
