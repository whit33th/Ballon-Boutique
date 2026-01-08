"use client";

import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import {
  type FieldErrors,
  type UseFormReturn,
  useWatch,
} from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import Input from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { CategoryGroupValue } from "@/constants/categories";
import { PRODUCT_CATEGORY_GROUPS } from "@/constants/categories";
import { BALLOON_COLORS, getColorStyle } from "@/constants/colors";
import { cn } from "@/lib/utils";
import { ImageUpload } from "./ImageUpload";
import type { PendingImage, UploadProgressState } from "./types";
import { formatCurrency } from "./utils";

export function createProductFormSchema(t: (key: string) => string) {
  return z
    .object({
      name: z.string().min(3, t("validation.nameMin3")),
      description: z.string().min(10, t("validation.descriptionMin10")),
      price: z
        .string()
        .min(1, t("validation.priceRequired"))
        .refine((raw) => {
          const numeric = Number(raw.replace(",", "."));
          return !Number.isNaN(numeric) && numeric >= 0;
        }, t("validation.priceInvalid")),
      miniSetSizes: z
        .array(
          z.object({
            label: z.string().min(1, t("validation.sizeLabelRequired")),
            price: z
              .string()
              .min(1, t("validation.sizePriceRequired"))
              .refine((raw) => {
                const numeric = Number(raw.replace(",", "."));
                return !Number.isNaN(numeric) && numeric >= 0;
              }, t("validation.sizePriceInvalid")),
          }),
        )
        .default([]),
      categoryGroup: z.string().min(1, t("validation.groupRequired")),
      categories: z
        .array(z.string())
        .min(1, t("validation.categoriesRequired")),
      inStock: z.boolean(),
      isPersonalizable: z
        .object({
          name: z.boolean(),
          number: z.boolean(),
        })
        .default({ name: false, number: false }),
      availableColors: z.array(z.string()).default([]),
    })
    .superRefine((data, ctx) => {
      if (data.categories.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["categories"],
          message: t("validation.categoriesRequired"),
        });
      }

      if (data.categoryGroup !== "mini-sets" && data.miniSetSizes.length > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["miniSetSizes"],
          message: t("validation.sizesOnlyForMiniSets"),
        });
      }
    });
}

// Legacy export for backward compatibility - will be removed
export const productFormSchema = z
  .object({
    name: z.string().min(3, "Минимум 3 символа"),
    description: z.string().min(10, "Добавьте более детальное описание"),
    price: z
      .string()
      .min(1, "Укажите цену")
      .refine((raw) => {
        const numeric = Number(raw.replace(",", "."));
        return !Number.isNaN(numeric) && numeric >= 0;
      }, "Некорректная цена"),
    miniSetSizes: z
      .array(
        z.object({
          label: z.string().min(1, "Укажите размер"),
          price: z
            .string()
            .min(1, "Укажите цену для размера")
            .refine((raw) => {
              const numeric = Number(raw.replace(",", "."));
              return !Number.isNaN(numeric) && numeric >= 0;
            }, "Некорректная цена"),
        }),
      )
      .default([]),
    categoryGroup: z.string().min(1, "Выберите группу"),
    categories: z.array(z.string()).min(1, "Добавьте хотя бы одну категорию"),
    inStock: z.boolean(),
    isPersonalizable: z
      .object({
        name: z.boolean(),
        number: z.boolean(),
      })
      .default({ name: false, number: false }),
    availableColors: z.array(z.string()).default([]),
  })
  .superRefine((data, ctx) => {
    if (data.categories.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["categories"],
        message: "Добавьте хотя бы одну категорию",
      });
    }

    if (data.categoryGroup !== "mini-sets" && data.miniSetSizes.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["miniSetSizes"],
        message: "Размеры доступны только для мини-сетов",
      });
    }
  });

export type ProductFormValues = z.infer<
  ReturnType<typeof createProductFormSchema>
>;

interface ProductFormProps {
  form: UseFormReturn<ProductFormValues>;
  isEditing: boolean;
  isSubmitting: boolean;
  isDeleting?: boolean;
  existingImageUrls: string[];
  pendingImages: PendingImage[];
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  uploadProgress?: UploadProgressState | null;
  onSubmit: (values: ProductFormValues) => Promise<void>;
  onError?: (errors: FieldErrors<ProductFormValues>) => void;
  onCancel: () => void;
  onDelete?: () => void | Promise<void>;
  onSelectImages: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveImage: (preview: string) => void;
  onRemoveExistingImage: (url: string) => void;
  onClearImages: () => void;
  onCollapse: () => void;
}

export function ProductForm({
  form,
  isEditing,
  isSubmitting,
  isDeleting,
  existingImageUrls,
  pendingImages,
  fileInputRef,
  uploadProgress,
  onSubmit,
  onError,
  onCancel,
  onDelete,
  onSelectImages,
  onRemoveImage,
  onRemoveExistingImage,
  onClearImages,
  onCollapse,
}: ProductFormProps) {
  const t = useTranslations("admin.productForm");
  const tAdmin = useTranslations("admin");
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const categoryGroup = useWatch({
    control: form.control,
    name: "categoryGroup",
  });
  const miniSetSizes =
    useWatch({
      control: form.control,
      name: "miniSetSizes",
    }) ?? [];

  const sizesEnabled = categoryGroup === "mini-sets" && miniSetSizes.length > 0;

  const miniSetPriceRange = useMemo(() => {
    if (!sizesEnabled) return null;

    const prices = miniSetSizes
      .map((entry) => Number(String(entry.price ?? "").replace(",", ".")))
      .filter((value) => Number.isFinite(value) && value >= 0);

    if (prices.length === 0) return null;

    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return { min, max };
  }, [miniSetSizes, sizesEnabled]);

  useEffect(() => {
    if (!miniSetPriceRange) return;

    const current = Number(
      String(form.getValues("price") ?? "").replace(",", "."),
    );
    if (!Number.isFinite(current) || current !== miniSetPriceRange.min) {
      form.setValue("price", String(miniSetPriceRange.min), {
        shouldDirty: true,
      });
    }
  }, [form, miniSetPriceRange]);

  const sizeRows = useMemo(() => miniSetSizes, [miniSetSizes]);

  const currentGroup = PRODUCT_CATEGORY_GROUPS.find(
    (item) => item.value === (categoryGroup as CategoryGroupValue),
  );
  const categoryOptions = currentGroup?.subcategories ?? [];
  const selectedCategories =
    useWatch({
      control: form.control,
      name: "categories",
    }) || [];

  const toggleCategory = (value: string) => {
    const next = selectedCategories.includes(value)
      ? selectedCategories.filter((category) => category !== value)
      : [...selectedCategories, value];
    form.setValue("categories", next, { shouldDirty: true });
  };

  const selectedCategoryCount = selectedCategories.length;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            {isEditing ? t("editTitle") : t("newTitle")}
          </h2>
          <p className="text-sm text-slate-500">
            {isEditing ? t("editDescription") : t("newDescription")}
          </p>
        </div>
        <Button
          variant="ghost"
          onClick={onCollapse}
          type="button"
          className="text-sm text-slate-500 hover:text-slate-900"
        >
          {t("collapse")}
        </Button>
      </div>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit, onError)}
          className="mt-6 grid gap-6"
        >
          <ImageUpload
            existingImageUrls={existingImageUrls}
            pendingImages={pendingImages}
            onSelectImages={onSelectImages}
            onRemoveImage={onRemoveImage}
            onRemoveExistingImage={onRemoveExistingImage}
            onClearAll={onClearImages}
            fileInputRef={fileInputRef}
          />

          <div className="grid gap-6 md:grid-cols-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>{t("name")}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Aurora Glow Balloon"
                      className="px-2.5"
                      aria-invalid={fieldState.invalid}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="price"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>{t("price")}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      className="px-2.5"
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="0"
                      placeholder="6.50"
                      disabled={sizesEnabled}
                      aria-invalid={fieldState.invalid}
                    />
                  </FormControl>
                  {miniSetPriceRange ? (
                    <p className="text-muted-foreground text-xs">
                      {miniSetPriceRange.min === miniSetPriceRange.max
                        ? formatCurrency(miniSetPriceRange.min)
                        : `${formatCurrency(miniSetPriceRange.min)}–${formatCurrency(miniSetPriceRange.max)}`}
                    </p>
                  ) : null}
                  <FormMessage />
                </FormItem>
              )}
            />

            {categoryGroup === "mini-sets" ? (
              <div className="md:col-span-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {t("sizeVariantsTitle")}
                      </p>
                      <p className="text-xs text-slate-600">
                        {t("sizeVariantsDescription")}
                      </p>
                    </div>
                    <label className="flex items-center gap-2 text-sm text-slate-800">
                      <input
                        type="checkbox"
                        checked={sizesEnabled}
                        onChange={(e) => {
                          if (e.target.checked) {
                            form.setValue(
                              "miniSetSizes",
                              [{ label: "", price: "" }],
                              { shouldDirty: true },
                            );
                          } else {
                            form.setValue("miniSetSizes", [], {
                              shouldDirty: true,
                            });
                          }
                        }}
                        className="accent-accent"
                      />
                      {t("enableSizeVariants")}
                    </label>
                  </div>

                  {sizesEnabled ? (
                    <div className="mt-4 grid gap-3">
                      {sizeRows.map((_, index) => (
                        <div
                          key={index}
                          className="grid gap-3 md:grid-cols-[1fr_180px_auto]"
                        >
                          <FormField
                            control={form.control}
                            name={`miniSetSizes.${index}.label` as never}
                            render={({ field, fieldState }) => (
                              <FormItem>
                                <FormLabel className="text-xs">
                                  {t("sizeLabel")}
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    className="px-2.5"
                                    placeholder="S / M / L"
                                    aria-invalid={fieldState.invalid}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`miniSetSizes.${index}.price` as never}
                            render={({ field, fieldState }) => (
                              <FormItem>
                                <FormLabel className="text-xs">
                                  {t("sizePrice")}
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    className="px-2.5"
                                    type="number"
                                    inputMode="decimal"
                                    step="0.1"
                                    min="0"
                                    placeholder="6.50"
                                    aria-invalid={fieldState.invalid}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <div className="flex items-end">
                            <Button
                              type="button"
                              variant="ghost"
                              className="text-slate-600"
                              onClick={() => {
                                const next = miniSetSizes.filter(
                                  (_entry, i) => i !== index,
                                );
                                form.setValue("miniSetSizes", next, {
                                  shouldDirty: true,
                                });
                              }}
                            >
                              {t("removeSize")}
                            </Button>
                          </div>
                        </div>
                      ))}

                      <div>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => {
                            form.setValue(
                              "miniSetSizes",
                              [...miniSetSizes, { label: "", price: "" }],
                              { shouldDirty: true },
                            );
                          }}
                        >
                          {t("addSize")}
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  {sizesEnabled ? (
                    <FormField
                      control={form.control}
                      name={"miniSetSizes"}
                      render={() => (
                        <FormItem className="mt-3">
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ) : null}
                </div>
              </div>
            ) : null}

            <FormField
              control={form.control}
              name="categoryGroup"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>{t("group")}</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger
                        className="h-11 w-full"
                        aria-invalid={fieldState.invalid}
                      >
                        <SelectValue placeholder={t("selectGroup")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PRODUCT_CATEGORY_GROUPS.map((group) => (
                        <SelectItem key={group.value} value={group.value}>
                          {tAdmin(`categoryGroups.${group.value}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {categoryOptions.length ? (
              <FormField
                control={form.control}
                name="categories"
                render={({ fieldState: _fieldState }) => (
                  <FormItem className="md:col-span-2">
                    <div className="flex items-center justify-between gap-2">
                      <FormLabel>{t("categories")}</FormLabel>
                      {selectedCategoryCount > 0 ? (
                        <span className="text-xs text-slate-500">
                          {t("selected")}: {selectedCategoryCount}
                        </span>
                      ) : null}
                    </div>
                    <FormControl>
                      <div className="flex flex-wrap gap-2">
                        {categoryOptions.map((subcategory) => {
                          const active = selectedCategories.includes(
                            subcategory.value,
                          );

                          const isDisabled =
                            (!active &&
                              selectedCategories.includes("Any Event")) ||
                            (subcategory.value === "Any Event" &&
                              selectedCategoryCount >= 1 &&
                              !active);
                          return (
                            <button
                              key={subcategory.value}
                              type="button"
                              onClick={() => toggleCategory(subcategory.value)}
                              disabled={isDisabled}
                              className={cn(
                                "rounded-full border px-3 py-1 text-sm transition",
                                active
                                  ? "border-accent bg-accent text-white"
                                  : "border-slate-200 bg-white text-slate-700",
                                isDisabled && "opacity-40",
                              )}
                            >
                              {tAdmin(`subcategories.${subcategory.value}`)}
                            </button>
                          );
                        })}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}
          </div>

          <FormField
            control={form.control}
            name="description"
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel>{t("description")}</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    rows={4}
                    placeholder={t("descriptionPlaceholder")}
                    aria-invalid={fieldState.invalid}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-6 md:grid-cols-2">
            <FormField
              control={form.control}
              name="inStock"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>{t("stockStatus")}</FormLabel>
                  <Select
                    value={field.value ? "in" : "out"}
                    onValueChange={(value) => field.onChange(value === "in")}
                  >
                    <FormControl>
                      <SelectTrigger
                        className="h-11 w-full"
                        aria-invalid={fieldState.invalid}
                      >
                        <SelectValue placeholder={t("selectStatus")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="in">{t("inStock")}</SelectItem>
                      <SelectItem value="out">{t("outOfStock")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="space-y-4">
            <h3 className="text-base font-semibold text-slate-900">
              {t("personalizationSettings")}
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="isPersonalizable.name"
                render={({ field, fieldState }) => {
                  const checkboxId = `personalization-name-${field.name}`;
                  return (
                    <FormItem>
                      <FormControl>
                        <label
                          htmlFor={checkboxId}
                          className={`flex cursor-pointer flex-row items-center justify-between rounded-lg border p-4 transition ${
                            field.value
                              ? "border-accent/60 bg-accent/5 hover:border-accent/80 hover:bg-accent/10"
                              : "border-slate-200 bg-white/50 hover:border-slate-300 hover:bg-white/80"
                          }`}
                        >
                          <div className="space-y-0.5">
                            <FormLabel
                              htmlFor={checkboxId}
                              className="cursor-pointer text-sm font-medium text-slate-900"
                            >
                              {t("nameLabel")}
                            </FormLabel>
                            <div className="text-xs text-slate-500">
                              {t("nameDescription")}
                            </div>
                          </div>
                          <input
                            id={checkboxId}
                            type="checkbox"
                            checked={field.value}
                            onChange={(e) => field.onChange(e.target.checked)}
                            className="text-accent focus:ring-accent/50 h-4 w-4 cursor-pointer rounded border-slate-300 transition-colors focus:ring-2 focus:ring-offset-0"
                            aria-invalid={fieldState.invalid}
                          />
                        </label>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
              <FormField
                control={form.control}
                name="isPersonalizable.number"
                render={({ field, fieldState }) => {
                  const checkboxId = `personalization-number-${field.name}`;
                  return (
                    <FormItem>
                      <FormControl>
                        <label
                          htmlFor={checkboxId}
                          className={`flex cursor-pointer flex-row items-center justify-between rounded-lg border p-4 transition ${
                            field.value
                              ? "border-accent/60 bg-accent/5 hover:border-accent/80 hover:bg-accent/10"
                              : "border-slate-200 bg-white/50 hover:border-slate-300 hover:bg-white/80"
                          }`}
                        >
                          <div className="space-y-0.5">
                            <FormLabel
                              htmlFor={checkboxId}
                              className="cursor-pointer text-sm font-medium text-slate-900"
                            >
                              {t("numberLabel")}
                            </FormLabel>
                            <div className="text-xs text-slate-500">
                              {t("numberDescription")}
                            </div>
                          </div>
                          <input
                            id={checkboxId}
                            type="checkbox"
                            checked={field.value}
                            onChange={(e) => field.onChange(e.target.checked)}
                            className="text-accent focus:ring-accent/50 h-4 w-4 cursor-pointer rounded border-slate-300 transition-colors focus:ring-2 focus:ring-offset-0"
                            aria-invalid={fieldState.invalid}
                          />
                        </label>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
            </div>
          </div>

          <FormField
            control={form.control}
            name="availableColors"
            render={({ field, fieldState }) => {
              const selected = field.value ?? [];
              const hasError = Boolean(fieldState.error);

              const toggleColor = (colorName: string) => {
                if (selected.includes(colorName)) {
                  field.onChange(selected.filter((item) => item !== colorName));
                  return;
                }
                field.onChange([...selected, colorName]);
              };

              return (
                <FormItem className="flex flex-col gap-2">
                  <FormLabel>{t("colors")}</FormLabel>
                  <FormControl>
                    <div
                      className={cn(
                        "flex flex-wrap gap-2",
                        hasError &&
                          "border-destructive/40 ring-destructive/20 rounded-xl border p-2 ring-1",
                      )}
                    >
                      {BALLOON_COLORS.map((color) => {
                        const active = selected.includes(color.name);
                        return (
                          <button
                            key={color.name}
                            type="button"
                            onClick={() => toggleColor(color.name)}
                            className={cn(
                              "flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition",
                              active
                                ? "border-accent bg-accent text-white shadow-sm"
                                : "border-transparent bg-slate-100 text-slate-700 hover:border-slate-300",
                            )}
                          >
                            <span
                              className="h-3 w-3 rounded-full"
                              style={{
                                ...getColorStyle(color.name, color.hex),
                              }}
                            />
                            {tAdmin.has(`colors.${color.name}`)
                              ? tAdmin(`colors.${color.name}`)
                              : color.name}
                          </button>
                        );
                      })}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              );
            }}
          />

          {uploadProgress ? (
            <div
              className={cn(
                "rounded-2xl border p-4 text-sm",
                uploadProgress.status === "error"
                  ? "border-red-200 bg-red-50"
                  : uploadProgress.status === "success"
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-slate-200 bg-slate-50",
              )}
            >
              <div className="flex items-center gap-3">
                {uploadProgress.status === "success" ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                ) : uploadProgress.status === "error" ? (
                  <AlertCircle className="h-5 w-5 text-red-500" />
                ) : (
                  <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
                )}
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {uploadProgress.message}
                  </p>
                  <p className="text-xs text-slate-500">
                    {uploadProgress.percentage}%
                  </p>
                </div>
              </div>
              <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    uploadProgress.status === "error"
                      ? "bg-red-500"
                      : uploadProgress.status === "success"
                        ? "bg-emerald-500"
                        : "bg-slate-900",
                  )}
                  style={{
                    width: `${Math.min(100, uploadProgress.percentage)}%`,
                  }}
                />
              </div>
            </div>
          ) : null}

          <div
            className={cn(
              "flex flex-wrap items-center gap-3",
              isEditing && onDelete ? "justify-between" : "justify-end",
            )}
          >
            {isEditing && onDelete ? (
              <>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setIsDeleteOpen(true)}
                  disabled={isDeleting}
                >
                  {isDeleting ? t("deleting") : t("deleteProduct")}
                </Button>

                <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{t("deleteDialogTitle")}</DialogTitle>
                      <DialogDescription>
                        {t("deleteDialogDescription")}
                      </DialogDescription>
                    </DialogHeader>

                    <DialogFooter>
                      <Button
                        variant="ghost"
                        onClick={() => setIsDeleteOpen(false)}
                      >
                        {t("cancel")}
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={async () => {
                          try {
                            await onDelete();
                          } finally {
                            setIsDeleteOpen(false);
                          }
                        }}
                        disabled={isDeleting}
                      >
                        {isDeleting ? t("deleting") : t("confirmDelete")}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </>
            ) : null}

            <div className="flex items-center gap-3">
              <Button type="button" variant="ghost" onClick={onCancel}>
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? t("saving") : t("saveProduct")}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
