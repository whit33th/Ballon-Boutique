"use client";

import { useMutation } from "convex/react";
import { useQuery } from "convex-helpers/react/cache";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import Input from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PRODUCT_CATEGORY_GROUPS } from "@/constants/categories";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

const formatDate = (timestamp?: number) => {
  if (!timestamp) {
    return "";
  }
  const date = new Date(timestamp);
  return date.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const parseDateInput = (value: string): number | undefined => {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }
  parsed.setHours(0, 0, 0, 0);
  return parsed.getTime();
};

type DiscountFormState = {
  id?: Id<"discounts">;
  name: string;
  percentage: string;
  scopeType: "product" | "group" | "category";
  productId?: Id<"products">;
  categoryGroup?: string;
  category?: string;
  startsAt?: string;
  endsAt?: string;
  isActive: boolean;
};

const emptyForm: DiscountFormState = {
  name: "",
  percentage: "",
  scopeType: "category",
  productId: undefined,
  categoryGroup: PRODUCT_CATEGORY_GROUPS[0]?.value,
  category: undefined,
  startsAt: "",
  endsAt: "",
  isActive: true,
};

interface DiscountsTabProps {
  products: Doc<"products">[];
}

type DiscountItem = Doc<"discounts"> & { productName?: string };

export function DiscountsTab({ products }: DiscountsTabProps) {
  const t = useTranslations("admin.discounts");
  const tCommon = useTranslations("common");
  const discountsApi = api as unknown as {
    discounts: {
      list: any;
      create: any;
      update: any;
      remove: any;
    };
  };
  const discounts = useQuery(discountsApi.discounts.list, {
    includeInactive: true,
  }) as DiscountItem[] | undefined;
  const createDiscount = useMutation(discountsApi.discounts.create);
  const updateDiscount = useMutation(discountsApi.discounts.update);
  const removeDiscount = useMutation(discountsApi.discounts.remove);

  const [form, setForm] = useState<DiscountFormState>(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasLoveDiscount = useMemo(() => {
    return (discounts ?? []).some(
      (discount) =>
        discount.scopeType === "category" &&
        discount.categoryGroup === "balloons" &&
        discount.category === "Love" &&
        discount.isActive,
    );
  }, [discounts]);

  const groupOptions = PRODUCT_CATEGORY_GROUPS;
  const categoryOptions = useMemo(() => {
    const group = PRODUCT_CATEGORY_GROUPS.find(
      (candidate) => candidate.value === form.categoryGroup,
    );
    return group?.subcategories ?? [];
  }, [form.categoryGroup]);

  const sortedProducts = useMemo(() => {
    return [...products].sort((a, b) => a.name.localeCompare(b.name));
  }, [products]);

  const resetForm = () => {
    setForm({ ...emptyForm });
  };

  const handleSubmit = async () => {
    if (isSubmitting) {
      return;
    }

    const percentage = Number(form.percentage.replace(",", "."));
    if (!Number.isFinite(percentage) || percentage <= 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: form.name.trim() || t("defaults.name"),
        percentage,
        scopeType: form.scopeType,
        productId: form.scopeType === "product" ? form.productId : undefined,
        categoryGroup:
          form.scopeType === "group" || form.scopeType === "category"
            ? form.categoryGroup
            : undefined,
        category: form.scopeType === "category" ? form.category : undefined,
        startsAt: parseDateInput(form.startsAt ?? ""),
        endsAt: parseDateInput(form.endsAt ?? ""),
        isActive: form.isActive,
      } as const;

      if (form.id) {
        await updateDiscount({ id: form.id, ...payload });
      } else {
        await createDiscount(payload);
      }

      resetForm();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (discount: DiscountItem) => {
    setForm({
      id: discount._id,
      name: discount.name,
      percentage: String(discount.percentage),
      scopeType: discount.scopeType,
      productId: discount.productId ?? undefined,
      categoryGroup: discount.categoryGroup ?? emptyForm.categoryGroup,
      category: discount.category ?? undefined,
      startsAt: discount.startsAt
        ? new Date(discount.startsAt).toISOString().slice(0, 10)
        : "",
      endsAt: discount.endsAt
        ? new Date(discount.endsAt).toISOString().slice(0, 10)
        : "",
      isActive: discount.isActive,
    });
  };

  const handleRemove = async (id: Id<"discounts">) => {
    if (isSubmitting) {
      return;
    }
    setIsSubmitting(true);
    try {
      await removeDiscount({ id });
      if (form.id === id) {
        resetForm();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggle = async (discount: DiscountItem) => {
    if (isSubmitting) {
      return;
    }
    setIsSubmitting(true);
    try {
      await updateDiscount({ id: discount._id, isActive: !discount.isActive });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateLoveDiscount = async () => {
    if (isSubmitting || hasLoveDiscount) {
      return;
    }
    setIsSubmitting(true);
    try {
      await createDiscount({
        name: "Love -15%",
        percentage: 15,
        scopeType: "category",
        categoryGroup: "balloons",
        category: "Love",
        isActive: true,
        productId: undefined,
        startsAt: undefined,
        endsAt: undefined,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              {t("title")}
            </h3>
            <p className="text-sm text-slate-600">{t("description")}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!hasLoveDiscount ? (
              <Button variant="outline" onClick={handleCreateLoveDiscount}>
                {t("actions.createLove")}
              </Button>
            ) : null}
            {form.id ? (
              <Button variant="outline" onClick={resetForm}>
                {t("actions.cancelEdit")}
              </Button>
            ) : null}
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-slate-700">
              {t("form.name")}
            </label>
            <Input
              value={form.name}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, name: event.target.value }))
              }
              placeholder={t("form.namePlaceholder")}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">
              {t("form.percentage")}
            </label>
            <Input
              value={form.percentage}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, percentage: event.target.value }))
              }
              placeholder="15"
              type="number"
              min="1"
              max="100"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">
              {t("form.scope")}
            </label>
            <Select
              value={form.scopeType}
              onValueChange={(value) =>
                setForm((prev) => ({
                  ...prev,
                  scopeType: value as DiscountFormState["scopeType"],
                }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("form.scope")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="category">{t("scope.category")}</SelectItem>
                <SelectItem value="group">{t("scope.group")}</SelectItem>
                <SelectItem value="product">{t("scope.product")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {form.scopeType === "product" ? (
            <div>
              <label className="text-sm font-medium text-slate-700">
                {t("form.product")}
              </label>
              <Select
                value={form.productId ?? ""}
                onValueChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    productId: value as Id<"products">,
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("form.productPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {sortedProducts.map((product) => (
                    <SelectItem key={product._id} value={product._id}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          {form.scopeType !== "product" ? (
            <div>
              <label className="text-sm font-medium text-slate-700">
                {t("form.group")}
              </label>
              <Select
                value={form.categoryGroup ?? ""}
                onValueChange={(value) =>
                  setForm((prev) => ({ ...prev, categoryGroup: value }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("form.groupPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {groupOptions.map((group) => (
                    <SelectItem key={group.value} value={group.value}>
                      {group.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          {form.scopeType === "category" ? (
            <div>
              <label className="text-sm font-medium text-slate-700">
                {t("form.category")}
              </label>
              <Select
                value={form.category ?? ""}
                onValueChange={(value) =>
                  setForm((prev) => ({ ...prev, category: value }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("form.categoryPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <div>
            <label className="text-sm font-medium text-slate-700">
              {t("form.startsAt")}
            </label>
            <Input
              value={form.startsAt}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, startsAt: event.target.value }))
              }
              type="date"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">
              {t("form.endsAt")}
            </label>
            <Input
              value={form.endsAt}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, endsAt: event.target.value }))
              }
              type="date"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              id="discount-active"
              type="checkbox"
              checked={form.isActive}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, isActive: event.target.checked }))
              }
              className="accent-accent"
            />
            <label htmlFor="discount-active" className="text-sm text-slate-700">
              {t("form.active")}
            </label>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {form.id ? t("actions.update") : t("actions.create")}
          </Button>
          <Button variant="outline" onClick={resetForm}>
            {tCommon("cancel")}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {discounts && discounts.length > 0 ? (
          discounts.map((discount) => (
            <div
              key={discount._id}
              className={cn(
                "rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm",
                !discount.isActive && "opacity-60",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {discount.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {t("labels.percentage", { value: discount.percentage })}
                  </p>
                </div>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-1 text-xs font-semibold",
                    discount.isActive
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-slate-100 text-slate-500",
                  )}
                >
                  {discount.isActive ? t("labels.active") : t("labels.paused")}
                </span>
              </div>

              <div className="mt-4 text-xs text-slate-600">
                <p>
                  {t("labels.scope")}: {t(`scope.${discount.scopeType}`)}
                </p>
                {discount.scopeType === "product" ? (
                  <p>
                    {t("labels.product")}: {discount.productName ?? "—"}
                  </p>
                ) : null}
                {discount.scopeType !== "product" ? (
                  <p>
                    {t("labels.group")}: {discount.categoryGroup ?? "—"}
                  </p>
                ) : null}
                {discount.scopeType === "category" ? (
                  <p>
                    {t("labels.category")}: {discount.category ?? "—"}
                  </p>
                ) : null}
                {discount.startsAt || discount.endsAt ? (
                  <p>
                    {t("labels.window")} {formatDate(discount.startsAt)}
                    {discount.endsAt ? `–${formatDate(discount.endsAt)}` : ""}
                  </p>
                ) : (
                  <p>{t("labels.windowNone")}</p>
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => handleEdit(discount)}>
                  {tCommon("edit")}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleToggle(discount)}
                >
                  {discount.isActive
                    ? t("actions.pause")
                    : t("actions.activate")}
                </Button>
                <Button
                  variant="ghost"
                  className="text-rose-600"
                  onClick={() => handleRemove(discount._id)}
                >
                  {tCommon("delete")}
                </Button>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 p-6 text-sm text-slate-500">
            {t("empty")}
          </div>
        )}
      </div>
    </div>
  );
}
