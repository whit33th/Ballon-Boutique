import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { fetchQuery } from "convex/nextjs";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { api } from "@/convex/_generated/api";

type LayoutProps = {
  children: ReactNode;
};

const ensureAdminUser = async () => {
  const token = await convexAuthNextjsToken();
  if (!token) {
    redirect("/auth");
  }

  let user = null;
  try {
    user = await fetchQuery(api.auth.loggedInUser, {}, { token });
  } catch (_error) {
    redirect("/auth");
  }

  if (!user) {
    redirect("/auth");
  }

  if (user.isAdmin !== true) {
    redirect("/");
  }
};

export default async function AdminLayout({ children }: LayoutProps) {
  await ensureAdminUser();
  return <>{children}</>;
}
