// proxy.ts
import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";

const isAuthPage = createRouteMatcher(["/auth(.*)", "/signin", "/signup"]);
const isProtectedRoute = createRouteMatcher(["/admin(.*)", "/profile(.*)"]);

export default convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  // Уже залогиненный не должен видеть /auth
  if (isAuthPage(request) && (await convexAuth.isAuthenticated())) {
    return nextjsMiddlewareRedirect(request, "/");
  }

  // Не залогинен, но идёт в защищённую зону
  if (isProtectedRoute(request) && !(await convexAuth.isAuthenticated())) {
    return nextjsMiddlewareRedirect(request, "/auth");
  }
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
