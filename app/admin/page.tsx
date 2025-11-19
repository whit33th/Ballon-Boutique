import { api } from "@/convex/_generated/api";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { preloadQuery, preloadedQueryResult } from "convex/nextjs";
import { redirect } from "next/navigation";
import AdminPageClient from "./ClientPage";

export default async function AdminPage() {
  const token = await convexAuthNextjsToken();

  const preloadedUser = await preloadQuery(
    api.auth.loggedInUser,
    {},
    { token },
  );

  const user = preloadedQueryResult(preloadedUser);

  if (!user) {
    redirect("/auth");
  }

  if (!user.isAdmin) {
    redirect("/");
  }

  return <AdminPageClient preloadedUser={preloadedUser} />;
}
