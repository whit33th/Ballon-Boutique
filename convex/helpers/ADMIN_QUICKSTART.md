# Quick Start: Admin Authorization

## Для Convex Functions

### 1. Импортируйте helper

```typescript
import { ensureAdmin } from "./helpers/admin";
```

### 2. Добавьте проверку в начало handler

```typescript
export const adminOnlyFunction = mutation({
  args: {
    /* ... */
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ensureAdmin(ctx); // ← Добавьте эту строку

    // Ваш код...
  },
});
```

### 3. Готово! 🎉

Теперь функция доступна только администраторам.

---

## Для Next.js Pages

### 1. Создайте admin layout

```typescript
// app/admin/layout.tsx
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { fetchQuery } from "convex/nextjs";
import { redirect } from "next/navigation";
import { api } from "@/convex/_generated/api";

export default async function AdminLayout({ children }) {
  const token = await convexAuthNextjsToken();
  const user = await fetchQuery(api.auth.loggedInUser, {}, { token });

  if (!user?.isAdmin) {
    redirect("/");
  }

  return <>{children}</>;
}
```

### 2. Готово! 🎉

Все страницы в `/admin/*` теперь защищены.

---

## ⚠️ ВАЖНО

**ВСЕГДА** проверяйте права в Convex функциях, даже если есть проверка в Next.js!

Convex API публичен и может быть вызван напрямую, минуя Next.js.

**Правильно ✅:**

```typescript
handler: async (ctx, args) => {
  await ensureAdmin(ctx); // ← Обязательная проверка
  // ...
};
```

**Неправильно ❌:**

```typescript
handler: async (ctx, args) => {
  // Нет проверки - ОПАСНО!
  // ...
};
```

---

## Примеры

### Query только для админов

```typescript
export const listAllOrders = query({
  args: {},
  returns: v.array(orderValidator),
  handler: async (ctx) => {
    await ensureAdmin(ctx);
    return await ctx.db.query("orders").collect();
  },
});
```

### Mutation только для админов

```typescript
export const deleteUser = mutation({
  args: { userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ensureAdmin(ctx);
    await ctx.db.delete(args.userId);
    return null;
  },
});
```

### Internal функция (не нужна проверка)

```typescript
import { internalMutation } from "./_generated/server";

export const cleanupData = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    // Internal функция - проверка не нужна
    // Может быть вызвана только из других Convex функций
  },
});
```

---

Подробная документация: `convex/helpers/admin.README.md`
