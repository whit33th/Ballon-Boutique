// proxy.ts
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

// Create next-intl middleware
const intlMiddleware = createMiddleware(routing);

export default convexAuthNextjsMiddleware(
  async (request, { convexAuth }) => {
    const { pathname } = request.nextUrl;

    // Handle API routes separately - they should not have locale prefix
    if (pathname.startsWith("/api/")) {
      // Protected API routes require authentication
      const isProtectedApiRoute =
        pathname.startsWith("/api/imagekit-") ||
        pathname.startsWith("/api/admin");

      if (isProtectedApiRoute && !(await convexAuth.isAuthenticated())) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      // Allow API routes to proceed without locale handling
      return NextResponse.next();
    }

    // Handle sitemap and robots.txt - they should not have locale prefix
    if (
      pathname === "/sitemap.xml" ||
      pathname.startsWith("/sitemap/") ||
      pathname === "/robots.txt" ||
      pathname === "/manifest.json" ||
      pathname === "/manifest.webmanifest"
    ) {
      return NextResponse.next();
    }

    // Handle locale redirection first
    // Check for saved locale preference in cookie
    const savedLocale = request.cookies.get("NEXT_LOCALE")?.value;

    // If user is on root path and has a saved preference, redirect to that locale
    if (pathname === "/" && isSupportedLocale(savedLocale)) {
      const url = request.nextUrl.clone();
      url.pathname = `/${savedLocale}`;
      return NextResponse.redirect(url);
    }

    // Apply next-intl middleware for locale handling
    const intlResponse = intlMiddleware(request);

    // If next-intl redirected, return it immediately (locale handling takes priority)
    if (intlResponse instanceof NextResponse && intlResponse.status === 307) {
      return intlResponse;
    }

    // After locale is handled, check auth routes
    // Extract locale from pathname if present
    const localeMatch = pathname.match(/^\/(at|en|ua|ru)(\/|$)/);
    const locale = localeMatch
      ? (localeMatch[1] as Locale)
      : routing.defaultLocale;
    const pathWithoutLocale = locale
      ? pathname.replace(`/${locale}`, "") || "/"
      : pathname;

    // Уже залогиненный не должен видеть /auth
    if (
      isAuthPage({ nextUrl: { pathname: pathWithoutLocale } } as NextRequest) &&
      (await convexAuth.isAuthenticated())
    ) {
      // Использование сохраненной локали из куки (если есть) или дефолтной,
      // чтобы сформировать корректный путь. Или просто перенаправить на корень:
      const redirectPath = isSupportedLocale(savedLocale)
        ? `/${savedLocale}`
        : "/";

      // Если вы хотите, чтобы он всегда переходил на корень, а next-intl сам разруливал:
      // const redirectPath = "/";

      return nextjsMiddlewareRedirect(request, redirectPath);
    }

    // Не залогинен, но идёт в защищённую зону
    if (
      isProtectedRoute({
        nextUrl: { pathname: pathWithoutLocale },
      } as NextRequest) &&
      !(await convexAuth.isAuthenticated())
    ) {
      const redirectPath = locale ? `/${locale}/auth` : "/auth";
      return nextjsMiddlewareRedirect(request, redirectPath);
    }

    // Return the response from next-intl if no auth redirect is needed
    return intlResponse;
  },
  { cookieConfig: { maxAge: 60 * 60 * 24 * 7 }, verbose: true },
);

export const config = {
  matcher: [
    "/((?!.*\\..*|_next).*)", // исключаем .* и _next, но включаем api
    "/",
    "/(api|trpc)(.*)", // API роуты должны проходить через middleware для авторизации
  ],
};
