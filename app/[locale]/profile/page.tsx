import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { preloadQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { redirect, routing } from "@/i18n/routing";
import ProfilePageClient from "./ProfilePageClient";

export default async function ProfilePage() {
  const token = await convexAuthNextjsToken();
  if (!token) {
    redirect({ href: "/", locale: routing.defaultLocale });
  }
  const preloadedUser = await preloadQuery(
    api.auth.loggedInUser,
    {},
    { token },
  );

  return <ProfilePageClient preloadedUser={preloadedUser} />;
}
