# Admin Authorization Helpers

Этот модуль предоставляет утилиты для проверки прав администратора в Convex функциях.

## Функции

### `ensureAdmin(ctx)`

Проверяет, что текущий пользователь аутентифицирован и является администратором.
Выбрасывает ошибку, если проверка не пройдена.

**Параметры:**

- `ctx: QueryCtx | MutationCtx` - контекст Convex функции

**Возвращает:**

- Объект пользователя-администратора

**Выбрасывает:**

- `"Not authenticated"` - если пользователь не авторизован
- `"Unauthorized: Admin access required"` - если пользователь не администратор

**Пример использования:**

```typescript
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { ensureAdmin } from "./helpers/admin";

// Query только для администраторов
export const listAllUsers = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("users"),
      name: v.optional(v.string()),
      email: v.optional(v.string()),
    }),
  ),
  handler: async (ctx) => {
    // Проверка прав администратора
    await ensureAdmin(ctx);

    const users = [];
    for await (const user of ctx.db.query("users")) {
      users.push(user);
    }
    return users;
  },
});

// Mutation только для администраторов
export const deleteUser = mutation({
  args: { userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Проверка прав администратора
    await ensureAdmin(ctx);

    await ctx.db.delete(args.userId);
    return null;
  },
});

// Использование возвращаемого значения
export const promoteToAdmin = mutation({
  args: { userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Получаем объект администратора, который выполняет действие
    const admin = await ensureAdmin(ctx);

    // Логируем действие
    console.log(`Admin ${admin.email} promoting user ${args.userId}`);

    await ctx.db.patch(args.userId, {
      isAdmin: true,
    });

    return null;
  },
});
```

### `ensureAuthenticated(ctx)`

Проверяет, что пользователь аутентифицирован (без проверки роли администратора).

**Параметры:**

- `ctx: QueryCtx | MutationCtx` - контекст Convex функции

**Возвращает:**

- Объект пользователя

**Выбрасывает:**

- `"Not authenticated"` - если пользователь не авторизован
- `"User not found"` - если пользователь не найден в базе данных

**Пример использования:**

```typescript
import { query } from "./_generated/server";
import { v } from "convex/values";
import { ensureAuthenticated } from "./helpers/admin";

export const getUserProfile = query({
  args: {},
  returns: v.object({
    _id: v.id("users"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
  }),
  handler: async (ctx) => {
    // Проверка что пользователь авторизован
    const user = await ensureAuthenticated(ctx);

    return {
      _id: user._id,
      name: user.name,
      email: user.email,
    };
  },
});
```

## Best Practices

### 1. Всегда проверяйте права в Convex функциях

**Правильно ✅:**

```typescript
export const deleteOrder = mutation({
  args: { orderId: v.id("orders") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ensureAdmin(ctx);
    await ctx.db.delete(args.orderId);
    return null;
  },
});
```

**Неправильно ❌:**

```typescript
// НЕ полагайтесь только на проверку в Next.js!
// Convex API публичен и может быть вызван напрямую
export const deleteOrder = mutation({
  args: { orderId: v.id("orders") },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Отсутствует проверка прав!
    await ctx.db.delete(args.orderId);
    return null;
  },
});
```

### 2. Используйте internal функции для служебных операций

**Правильно ✅:**

```typescript
import { internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

// Internal функция - не доступна извне
export const cleanupOldOrders = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    // Проверка не нужна - функция внутренняя
    const oldOrders = await ctx.db
      .query("orders")
      .filter((q) =>
        q.lt(q.field("_creationTime"), Date.now() - 30 * 24 * 60 * 60 * 1000),
      )
      .collect();

    for (const order of oldOrders) {
      await ctx.db.delete(order._id);
    }
    return null;
  },
});

// Public функция для вызова internal операции
export const triggerCleanup = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    await ensureAdmin(ctx);
    await ctx.scheduler.runAfter(0, internal.orders.cleanupOldOrders);
    return null;
  },
});
```

### 3. Комбинируйте проверки на уровне Next.js и Convex

**Next.js Layout (проверка UI):**

```typescript
// app/admin/layout.tsx
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { fetchQuery } from "convex/nextjs";
import { redirect } from "next/navigation";

const ensureAdminUser = async () => {
  const token = await convexAuthNextjsToken();
  if (!token) {
    redirect("/auth");
  }

  const user = await fetchQuery(api.auth.loggedInUser, {}, { token });
  if (!user?.isAdmin) {
    redirect("/");
  }
};

export default async function AdminLayout({ children }) {
  await ensureAdminUser();
  return <>{children}</>;
}
```

**Convex Functions (обязательная проверка):**

```typescript
// convex/orders.ts
export const listAll = query({
  args: {},
  returns: v.array(orderValidator),
  handler: async (ctx) => {
    // ОБЯЗАТЕЛЬНАЯ проверка - даже если есть проверка в Next.js
    await ensureAdmin(ctx);

    const orders = [];
    for await (const order of ctx.db.query("orders")) {
      orders.push(order);
    }
    return orders;
  },
});
```

### 4. Правильная обработка ошибок на клиенте

```typescript
"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";

export function AdminPanel() {
  const deleteOrder = useMutation(api.orders.deleteOrder);

  const handleDelete = async (orderId: Id<"orders">) => {
    try {
      await deleteOrder({ orderId });
      toast.success("Order deleted");
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes("Admin access required")) {
          toast.error("You don't have permission to do this");
        } else if (error.message.includes("Not authenticated")) {
          toast.error("Please sign in");
        } else {
          toast.error("Failed to delete order");
        }
      }
    }
  };

  return <button onClick={() => handleDelete(orderId)}>Delete</button>;
}
```

## Примеры использования

### Admin Query с фильтрацией

```typescript
export const getOrderStats = query({
  args: {
    startDate: v.number(),
    endDate: v.number(),
  },
  returns: v.object({
    totalOrders: v.number(),
    totalRevenue: v.number(),
    averageOrderValue: v.number(),
  }),
  handler: async (ctx, args) => {
    await ensureAdmin(ctx);

    const orders = await ctx.db
      .query("orders")
      .filter((q) =>
        q.and(
          q.gte(q.field("_creationTime"), args.startDate),
          q.lte(q.field("_creationTime"), args.endDate),
        ),
      )
      .collect();

    const totalRevenue = orders.reduce(
      (sum, order) => sum + order.totalAmount,
      0,
    );

    return {
      totalOrders: orders.length,
      totalRevenue,
      averageOrderValue: orders.length > 0 ? totalRevenue / orders.length : 0,
    };
  },
});
```

### Admin Mutation с валидацией

```typescript
export const updateOrderStatus = mutation({
  args: {
    orderId: v.id("orders"),
    status: v.union(
      v.literal("pending"),
      v.literal("confirmed"),
      v.literal("shipped"),
      v.literal("delivered"),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const admin = await ensureAdmin(ctx);

    const order = await ctx.db.get(args.orderId);
    if (!order) {
      throw new Error("Order not found");
    }

    // Валидация переходов статусов
    const validTransitions: Record<string, string[]> = {
      pending: ["confirmed", "cancelled"],
      confirmed: ["shipped", "cancelled"],
      shipped: ["delivered"],
      delivered: [],
    };

    if (!validTransitions[order.status]?.includes(args.status)) {
      throw new Error(
        `Cannot change status from ${order.status} to ${args.status}`,
      );
    }

    await ctx.db.patch(args.orderId, {
      status: args.status,
    });

    console.log(
      `Admin ${admin.email} changed order ${args.orderId} status to ${args.status}`,
    );

    return null;
  },
});
```

## Безопасность

1. **Никогда не полагайтесь только на проверку в UI** - Convex API публичен и может быть вызван напрямую
2. **Всегда проверяйте права в handler функции** - используйте `ensureAdmin` или `ensureAuthenticated`
3. **Используйте internal функции** для операций, которые не должны быть доступны извне
4. **Логируйте административные действия** для аудита
5. **Валидируйте входные данные** даже для admin функций

## См. также

- [Convex Auth Documentation](https://docs.convex.dev/auth)
- [Server-side Authentication in Next.js](https://docs.convex.dev/client/nextjs/app-router/server-rendering)
- `convex/helpers/auth.ts` - дополнительные auth утилиты
