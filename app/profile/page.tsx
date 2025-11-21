import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { preloadQuery } from "convex/nextjs";
import { redirect } from "next/navigation";
import { api } from "@/convex/_generated/api";
import ProfilePageClient from "./ProfilePageClient";

export default async function ProfilePage() {
  const token = await convexAuthNextjsToken();
  if (!token) {
    redirect("/");
  }
  const preloadedUser = await preloadQuery(
    api.auth.loggedInUser,
    {},
    { token },
  );

  const preloadedOrders = await preloadQuery(api.orders.list, {}, { token });

  return (
    <ProfilePageClient
      preloadedUser={preloadedUser}
      preloadedOrders={preloadedOrders}
    />
  );
}
