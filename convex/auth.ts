import Google from "@auth/core/providers/google";
import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth, getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { query } from "./_generated/server";
import { optionalAddressValidator } from "./validators/address";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password, Google],
});

export const loggedInUser = query({
  args: {},
  returns: v.union(
    v.object({
      _id: v.id("users"),
      name: v.optional(v.string()),
      email: v.optional(v.string()),
      phone: v.optional(v.string()),
      address: optionalAddressValidator,
      isAdmin: v.optional(v.boolean()),
      imageFileId: v.optional(v.union(v.id("_storage"), v.string())),
      image: v.optional(v.string()),
    }),
    v.null(),
  ),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      return null;
    }
    return {
      _id: userId,
      name: user.name ?? undefined,
      email: user.email ?? undefined,
      phone: user.phone ?? undefined,
      address: user.address ?? undefined,
      isAdmin: user.isAdmin ?? undefined,
      imageFileId: user.imageFileId ?? undefined,
      image: user.image ?? undefined,
    };
  },
});
