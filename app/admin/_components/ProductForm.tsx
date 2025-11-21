import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useState } from "react";
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
  });

export type ProductFormValues = z.infer<typeof productFormSchema>;

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
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const categoryGroup = useWatch({
    control: form.control,
    name: "categoryGroup",
  });

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
            {isEditing ? "Редактирование товара" : "Новый продукт"}
          </h2>
          <p className="text-sm text-slate-500">
            {isEditing
              ? "Обновите характеристики и фотографии выбранного товара."
              : "Заполните ключевые параметры и прикрепите фотографии."}
          </p>
        </div>
        <Button
          variant="ghost"
          onClick={onCollapse}
          type="button"
          className="text-sm text-slate-500 hover:text-slate-900"
        >
          Свернуть
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
                  <FormLabel>Название</FormLabel>
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
                  <FormLabel>Цена (€)</FormLabel>
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

            <FormField
              control={form.control}
              name="categoryGroup"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Группа</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger
                        className="h-11 w-full"
                        aria-invalid={fieldState.invalid}
                      >
                        <SelectValue placeholder="Выберите группу" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PRODUCT_CATEGORY_GROUPS.map((group) => (
                        <SelectItem key={group.value} value={group.value}>
                          {group.label}
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
                      <FormLabel>Категории</FormLabel>
                      {selectedCategoryCount > 0 ? (
                        <span className="text-xs text-slate-500">
                          Выбрано: {selectedCategoryCount}
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
                              {subcategory.label}
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
                <FormLabel>Описание</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    rows={4}
                    placeholder="Уникальные особенности, сценарии использования, материалы..."
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
                  <FormLabel>Статус наличия</FormLabel>
                  <Select
                    value={field.value ? "in" : "out"}
                    onValueChange={(value) => field.onChange(value === "in")}
                  >
                    <FormControl>
                      <SelectTrigger
                        className="h-11 w-full"
                        aria-invalid={fieldState.invalid}
                      >
                        <SelectValue placeholder="Выберите статус" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="in">В наличии</SelectItem>
                      <SelectItem value="out">Нет на складе</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="space-y-4">
            <h3 className="text-base font-semibold text-slate-900">
              Настройки персонализации
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
                              Имя
                            </FormLabel>
                            <div className="text-xs text-slate-500">
                              Разрешить ввод имени (опционально)
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
                              Цифра
                            </FormLabel>
                            <div className="text-xs text-slate-500">
                              Разрешить ввод цифры (обязательно)
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
                  <FormLabel>Цвета</FormLabel>
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
                            {color.label}
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
                  {isDeleting ? "Удаляем..." : "Удалить товар"}
                </Button>

                <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Удалить товар?</DialogTitle>
                      <DialogDescription>
                        Это действие нельзя отменить. Все данные товара будут
                        удалены. Вы уверены, что хотите продолжить?
                      </DialogDescription>
                    </DialogHeader>

                    <DialogFooter>
                      <Button
                        variant="ghost"
                        onClick={() => setIsDeleteOpen(false)}
                      >
                        Отмена
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
                        {isDeleting ? "Удаляем..." : "Подтвердить удаление"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </>
            ) : null}

            <div className="flex items-center gap-3">
              <Button type="button" variant="ghost" onClick={onCancel}>
                Отмена
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Сохраняем..." : "Сохранить товар"}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
