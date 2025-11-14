import { useForm, type UseFormReturn, useWatch } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
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
import { BALLOON_COLORS } from "@/constants/colors";
import { cn } from "@/lib/utils";
import { ImageUpload } from "./ImageUpload";
import type { PendingImage } from "./types";

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
    category: z.string().optional(),
    inStock: z.boolean(),
    isPersonalizable: z.boolean().default(true),
    availableColors: z.array(z.string()).default([]),
  })
  .superRefine((data, ctx) => {
    const requiresCategory =
      data.categoryGroup === "balloons" ||
      data.categoryGroup === "balloon-bouquets";

    if (requiresCategory) {
      if (!data.category || data.category.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["category"],
          message: "Выберите категорию",
        });
      }
    }
  });

export type ProductFormValues = z.infer<typeof productFormSchema>;

interface ProductFormProps {
  form: UseFormReturn<ProductFormValues>;
  isEditing: boolean;
  isSubmitting: boolean;
  existingImageUrls: string[];
  pendingImages: PendingImage[];
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onSubmit: (e?: React.BaseSyntheticEvent) => Promise<void>;
  onCancel: () => void;
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
  existingImageUrls,
  pendingImages,
  fileInputRef,
  onSubmit,
  onCancel,
  onSelectImages,
  onRemoveImage,
  onRemoveExistingImage,
  onClearImages,
  onCollapse,
}: ProductFormProps) {
  const categoryGroup = useWatch({
    control: form.control,
    name: "categoryGroup",
  });

  const currentGroup = PRODUCT_CATEGORY_GROUPS.find(
    (item) => item.value === (categoryGroup as CategoryGroupValue),
  );
  const categoryOptions = currentGroup?.subcategories ?? [];
  const showCategorySelect = categoryOptions.length > 0;

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
        <form onSubmit={onSubmit} className="mt-6 grid gap-6">
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

            {showCategorySelect ? (
              <FormField
                control={form.control}
                name="category"
                render={({ field, fieldState }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Категория</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger
                          className="h-11 w-full"
                          aria-invalid={fieldState.invalid}
                        >
                          <SelectValue placeholder="Категория" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categoryOptions.map((subcategory) => (
                          <SelectItem
                            key={subcategory.value}
                            value={subcategory.value}
                          >
                            {subcategory.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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

            <FormField
              control={form.control}
              name="isPersonalizable"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Персонализация</FormLabel>
                  <Select
                    value={field.value ? "yes" : "no"}
                    onValueChange={(value) => field.onChange(value === "yes")}
                  >
                    <FormControl>
                      <SelectTrigger
                        className="h-11 w-full"
                        aria-invalid={fieldState.invalid}
                      >
                        <SelectValue placeholder="Персонализация" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="yes">Возможна</SelectItem>
                      <SelectItem value="no">Не требуется</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
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
                                backgroundColor: color.hex,
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

          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="ghost" onClick={onCancel}>
              Отмена
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Сохраняем..." : "Сохранить товар"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
