import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { preloadQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import ProfilePageClient from "./ProfilePageClient";

export default async function ProfilePage() {
  const token = await convexAuthNextjsToken();

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
