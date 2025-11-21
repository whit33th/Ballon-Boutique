import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation } from "./_generated/server";
import { requireUser } from "./helpers/auth";
import { optionalAddressValidator } from "./validators/address";

const STORAGE_ID_PATTERN = /^[a-z0-9]{32}$/;

const isStorageId = (value: unknown): value is Id<"_storage"> =>
  typeof value === "string" && STORAGE_ID_PATTERN.test(value);

const profileResponseValidator = v.object({
  _id: v.id("users"),
  name: v.optional(v.string()),
  email: v.optional(v.string()),
  phone: v.optional(v.string()),
  address: optionalAddressValidator,
  imageFileId: v.optional(v.union(v.id("_storage"), v.string())),
  image: v.optional(v.string()),
});

type ProfilePatch = {
  name?: string;
  email?: string;
  phone?: string;
  address?: {
    streetAddress: string;
    city: string;
    postalCode: string;
    deliveryNotes: string;
  };
  imageFileId?: Id<"_storage"> | string;
  image?: string;
};

export const updateProfile = mutation({
  args: {
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: optionalAddressValidator,
    image: v.optional(v.string()),
  },
  returns: profileResponseValidator,
  handler: async (ctx, args) => {
    const { userId, user } = await requireUser(ctx);

    const patch: ProfilePatch = {};
    if (args.name !== undefined) {
      patch.name = args.name;
    }
    if (args.email !== undefined) {
      patch.email = args.email;
    }
    if (args.phone !== undefined) {
      patch.phone = args.phone;
    }
    if (args.address !== undefined) {
      patch.address = args.address;
    }
    if (args.image !== undefined) {
      patch.image = args.image;
    }

    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(userId, patch);
    }

    const updatedUser = ((await ctx.db.get(userId)) ?? user) as ProfilePatch;

    return {
      _id: userId,
      name: updatedUser.name ?? undefined,
      email: updatedUser.email ?? undefined,
      phone: updatedUser.phone ?? undefined,
      address: updatedUser.address ?? undefined,
      imageFileId: updatedUser.imageFileId ?? undefined,
      image: updatedUser.image ?? undefined,
    };
  },
});

export const updateAvatar = mutation({
  args: {
    imageFileId: v.optional(v.union(v.id("_storage"), v.string())),
    image: v.optional(v.string()),
  },
  returns: profileResponseValidator,
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx);
    const user = await ctx.db.get(userId);
    const previousFileId = user?.imageFileId;

    const patch: ProfilePatch = {};

    if (args.imageFileId !== undefined) {
      patch.imageFileId = args.imageFileId as Id<"_storage"> | string;
      // Try to resolve a public URL for the storage id and save it to `image` too
      try {
        if (isStorageId(args.imageFileId)) {
          const publicUrl = await ctx.storage.getUrl(
            args.imageFileId as Id<"_storage">,
          );
          patch.image = publicUrl ?? undefined;
        }
      } catch (_e) {
        // ignore errors resolving public url
      }
    }

    if (args.image !== undefined) {
      patch.image = args.image ?? null;
    }

    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(userId, patch);
    }

    if (
      previousFileId &&
      args.imageFileId &&
      previousFileId !== args.imageFileId &&
      isStorageId(previousFileId)
    ) {
      try {
        await ctx.storage.delete(previousFileId);
      } catch (_e) {
        // ignore delete errors
      }
    }

    const updatedUser = (await ctx.db.get(userId)) ?? user;

    return {
      _id: userId,
      name: updatedUser?.name ?? undefined,
      email: updatedUser?.email ?? undefined,
      phone: updatedUser?.phone ?? undefined,
      address: updatedUser?.address ?? undefined,
      imageFileId: updatedUser?.imageFileId ?? undefined,
      image: updatedUser?.image ?? undefined,
    };
  },
});

export const deleteAccount = mutation({
  args: {},
  returns: v.object({ deleted: v.boolean() }),
  handler: async (ctx) => {
    const { userId, user } = await requireUser(ctx);

    // Attempt to delete any uploaded avatar from storage
    try {
      const previousFileId = (user as any)?.imageFileId;
      if (previousFileId && isStorageId(previousFileId)) {
        try {
          await ctx.storage.delete(previousFileId as Id<"_storage">);
        } catch (_e) {
          // ignore storage delete errors
        }
      }
    } catch (_e) {
      // ignore
    }

    // Remove authentication-related records tied to this user
    // Helper to run async map operations
    const asyncMap = async <T, R>(arr: T[], fn: (v: T) => Promise<R>) =>
      Promise.all(arr.map(fn));

    try {
      const [authSessions, authAccounts] = await Promise.all([
        ctx.db
          .query("authSessions")
          .withIndex("userId", (q) => q.eq("userId", userId))
          .collect(),
        ctx.db
          .query("authAccounts")
          .withIndex("userId", (q) => q.eq("userId", userId))
          .collect(),
      ]);

      const [authRefreshTokens, authVerificationCodes, authVerifiers] =
        await Promise.all([
          (
            await asyncMap(authSessions, async (session: any) => {
              return ctx.db
                .query("authRefreshTokens")
                .withIndex("sessionId", (q) => q.eq("sessionId", session._id))
                .collect();
            })
          ).flat(),
          (
            await asyncMap(authAccounts, async (account: any) => {
              return ctx.db
                .query("authVerificationCodes")
                .withIndex("accountId", (q) => q.eq("accountId", account._id))
                .collect();
            })
          ).flat(),
          (
            await asyncMap(authSessions, async (session: any) => {
              return ctx.db
                .query("authVerifiers")
                .withIndex("sessionId", (q) => q.eq("sessionId", session._id))
                .collect();
            })
          ).flat(),
        ]);

      await Promise.all([
        asyncMap(authSessions, (session: any) => ctx.db.delete(session._id)),
        asyncMap(authAccounts, (account: any) => ctx.db.delete(account._id)),
        asyncMap(authRefreshTokens, (token: any) => ctx.db.delete(token._id)),
        asyncMap(authVerificationCodes, (code: any) => ctx.db.delete(code._id)),
        asyncMap(authVerifiers, (verifier: any) => ctx.db.delete(verifier._id)),
      ]);
    } catch (_e) {
      // If anything goes wrong while cleaning auth records, continue with user deletion
    }

    // Finally, remove the user document
    await ctx.db.delete(userId);

    return { deleted: true };
  },
});
