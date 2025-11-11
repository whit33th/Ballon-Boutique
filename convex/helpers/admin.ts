import { getAuthUserId } from "@convex-dev/auth/server";
import type { MutationCtx, QueryCtx } from "../_generated/server";

/**
 * Проверяет, что пользователь аутентифицирован и является администратором
 * Выбрасывает ошибку, если пользователь не прошел проверку
 *
 * @example
 * export const deleteUser = mutation({
 *   args: { userId: v.id("users") },
 *   handler: async (ctx, args) => {
 *     await ensureAdmin(ctx);
 *     await ctx.db.delete(args.userId);
 *   },
 * });
 */
export async function ensureAdmin(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("Not authenticated");
  }

  const user = await ctx.db.get(userId);
  if (!user?.isAdmin) {
    throw new Error("Unauthorized: Admin access required");
  }

  return user;
}

/**
 * Проверяет, что пользователь аутентифицирован
 * Выбрасывает ошибку, если пользователь не авторизован
 *
 * @example
 * export const getUserProfile = query({
 *   args: {},
 *   handler: async (ctx, args) => {
 *     const user = await ensureAuthenticated(ctx);
 *     return user;
 *   },
 * });
 */
export async function ensureAuthenticated(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("Not authenticated");
  }

  const user = await ctx.db.get(userId);
  if (!user) {
    throw new Error("User not found");
  }

  return user;
}
