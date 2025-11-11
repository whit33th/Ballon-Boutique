"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "convex/react";
import { useQuery } from "convex-helpers/react/cache";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { CategoryGroupValue } from "@/constants/categories";
import { PRODUCT_CATEGORY_GROUPS } from "@/constants/categories";
import { BALLOON_COLORS } from "@/constants/colors";
import { cn } from "@/lib/utils";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";

const SIZE_OPTIONS = ["30cm", "45cm", "80cm", "100cm"] as const;

type OrderStatus = Doc<"orders">["status"];
type BalloonSize = (typeof SIZE_OPTIONS)[number];

type PendingImage = {
  file: File;
  preview: string;
};

const DEFAULT_CATEGORY_GROUP = PRODUCT_CATEGORY_GROUPS[0];
const DEFAULT_CATEGORY =
  DEFAULT_CATEGORY_GROUP.subcategories[0]?.value ??
  DEFAULT_CATEGORY_GROUP.categoryValue ??
  "";

const currencyFormatter = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
});

const formatCurrency = (value: number) => currencyFormatter.format(value);

const formatDateTime = (timestamp: number) =>
  new Date(timestamp).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

const ORDER_STATUS_META: Record<OrderStatus, { label: string; tone: string }> =
  {
    pending: {
      label: "В обработке",
      tone: "bg-amber-100 text-amber-900",
    },
    confirmed: {
      label: "Подтверждён",
      tone: "bg-sky-100 text-sky-900",
    },
    shipped: {
      label: "Отправлен",
      tone: "bg-indigo-100 text-indigo-900",
    },
    delivered: {
      label: "Доставлен",
      tone: "bg-emerald-100 text-emerald-900",
    },
  };

const ORDER_STATUS_FILTERS: Array<{
  value: OrderStatus | "all";
  label: string;
}> = [
  { value: "all", label: "Все статусы" },
  { value: "pending", label: "В обработке" },
  { value: "confirmed", label: "Подтверждён" },
  { value: "shipped", label: "Отправлен" },
  { value: "delivered", label: "Доставлен" },
];

const productFormSchema = z.object({
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
  category: z.string().min(1, "Выберите категорию"),
  size: z.enum(SIZE_OPTIONS),
  inStock: z.boolean(),
  isPersonalizable: z.boolean(),
  availableColors: z.array(z.string()).max(8, "Не больше 8 цветов").default([]),
});

type ProductFormValues = z.infer<typeof productFormSchema>;

const productDefaultValues: ProductFormValues = {
  name: "",
  description: "",
  price: "",
  categoryGroup: DEFAULT_CATEGORY_GROUP.value,
  category: DEFAULT_CATEGORY,
  size: SIZE_OPTIONS[0],
  inStock: true,
  isPersonalizable: false,
  availableColors: [],
};

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<
    "products" | "orders" | "insights"
  >("products");
  const [formOpen, setFormOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const previewUrlsRef = useRef<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formPanelRef = useRef<HTMLDivElement>(null);

  const createProduct = useMutation(api.products.create);
  const generateUploadUrl = useMutation(api.products.generateUploadUrl);

  const productsResult = useQuery(api.products.list, {
    paginationOpts: { numItems: 100, cursor: null },
  });

  const ordersResult = useQuery(api.orders.listAll, {
    status: statusFilter === "all" ? undefined : statusFilter,
    sort: sortOrder,
  });

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: productDefaultValues,
  });

  const categoryGroup = form.watch("categoryGroup");

  useEffect(() => {
    if (formOpen && formPanelRef.current) {
      formPanelRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [formOpen]);

  useEffect(() => {
    const group = PRODUCT_CATEGORY_GROUPS.find(
      (item) => item.value === (categoryGroup as CategoryGroupValue),
    );
    if (!group) {
      return;
    }

    const fallback = group.subcategories[0]?.value ?? group.categoryValue ?? "";
    if (!fallback) {
      return;
    }

    const current = form.getValues("category");
    const isValid =
      group.subcategories.length === 0
        ? current === fallback
        : group.subcategories.some(
            (subcategory) => subcategory.value === current,
          );

    if (!isValid) {
      form.setValue("category", fallback, { shouldDirty: true });
    }
  }, [categoryGroup, form]);

  const products = productsResult?.page ?? [];
  const ordersLoading = ordersResult === undefined;
  const orders = ordersResult ?? [];

  const currentGroup = PRODUCT_CATEGORY_GROUPS.find(
    (item) => item.value === (categoryGroup as CategoryGroupValue),
  );
  const categoryOptions = currentGroup?.subcategories ?? [];
  const fallbackCategory = currentGroup?.categoryValue ?? "";

  const productMetrics = useMemo(() => {
    if (!products.length) {
      return {
        total: 0,
        available: 0,
        outOfStock: 0,
        personalizable: 0,
        averagePrice: 0,
      };
    }

    const available = products.filter((product) => product.inStock).length;
    const personalizable = products.filter(
      (product) => product.isPersonalizable,
    ).length;
    const priceSum = products.reduce((acc, product) => acc + product.price, 0);

    return {
      total: products.length,
      available,
      outOfStock: products.length - available,
      personalizable,
      averagePrice: priceSum / products.length,
    };
  }, [products]);

  const orderMetrics = useMemo(() => {
    if (!orders.length) {
      return { total: 0, pending: 0, delivered: 0, revenue: 0 };
    }

    const pending = orders.filter((order) => order.status === "pending").length;
    const delivered = orders.filter(
      (order) => order.status === "delivered",
    ).length;
    const revenue = orders.reduce((acc, order) => acc + order.totalAmount, 0);

    return { total: orders.length, pending, delivered, revenue };
  }, [orders]);

  const handleSelectImages = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) {
      return;
    }

    const availableSlots = Math.max(0, 8 - pendingImages.length);
    const selected = Array.from(files).slice(0, availableSlots);

    if (!selected.length) {
      toast.info("Достигнут лимит из восьми фотографий");
      event.target.value = "";
      return;
    }

    const nextImages: PendingImage[] = [];

    for (const file of selected) {
      if (!file.type.startsWith("image/")) {
        toast.error(`Файл ${file.name} не является изображением`);
        continue;
      }
      if (file.size > 6 * 1024 * 1024) {
        toast.error(`Файл ${file.name} превышает 6 MB`);
        continue;
      }

      const preview = URL.createObjectURL(file);
      previewUrlsRef.current.push(preview);
      nextImages.push({ file, preview });
    }

    if (nextImages.length) {
      setPendingImages((prev) => [...prev, ...nextImages]);
    }

    event.target.value = "";
  };

  const handleRemoveImage = (preview: string) => {
    setPendingImages((prev) => prev.filter((item) => item.preview !== preview));
    previewUrlsRef.current = previewUrlsRef.current.filter(
      (url) => url !== preview,
    );
    URL.revokeObjectURL(preview);
  };

  const resetImages = () => {
    previewUrlsRef.current.forEach((url) => {
      URL.revokeObjectURL(url);
    });
    previewUrlsRef.current = [];
    setPendingImages([]);
  };

  const onSubmit = form.handleSubmit(async (values) => {
    setIsSubmitting(true);
    try {
      const imageIds: Id<"_storage">[] = [];

      for (const pending of pendingImages) {
        const uploadUrl = await generateUploadUrl();
        const response = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": pending.file.type },
          body: pending.file,
        });

        const payload = await response.json();
        if (!response.ok) {
          throw new Error(
            typeof payload?.message === "string"
              ? payload.message
              : "Не удалось загрузить изображение",
          );
        }

        imageIds.push(payload.storageId as Id<"_storage">);
      }

      const numericPrice = Number(values.price.replace(",", "."));

      await createProduct({
        name: values.name.trim(),
        description: values.description.trim(),
        price: numericPrice,
        categoryGroup: values.categoryGroup,
        category: values.category,
        size: values.size,
        imageIds,
        inStock: values.inStock,
        isPersonalizable: values.isPersonalizable,
        availableColors: values.availableColors.length
          ? values.availableColors
          : undefined,
      });

      toast.success("Товар сохранён");
      form.reset(productDefaultValues);
      resetImages();
      setFormOpen(false);
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Не удалось создать товар",
      );
    } finally {
      setIsSubmitting(false);
    }
  });

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-white to-purple-50">
      <main className="mx-auto w-full max-w-7xl px-4 py-10 lg:px-8">
        <div className="mb-6 space-y-1">
          <h1 className="text-3xl font-semibold text-slate-900">
            Панель управления
          </h1>
          <p className="text-sm text-slate-600">
            Быстро добавляйте новые товары, отслеживайте заказы и следите за
            ключевыми показателями магазина.
          </p>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(value) =>
            setActiveTab(value as "products" | "orders" | "insights")
          }
          className="space-y-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <TabsList>
              <TabsTrigger value="products">Товары</TabsTrigger>
              <TabsTrigger value="orders">Заказы</TabsTrigger>
              <TabsTrigger value="insights">Аналитика</TabsTrigger>
            </TabsList>

            <Button
              onClick={() => {
                setActiveTab("products");
                setFormOpen(true);
              }}
            >
              + Товар
            </Button>
          </div>

          <TabsContent value="products">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="space-y-6">
                {formOpen ? (
                  <div
                    ref={formPanelRef}
                    className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h2 className="text-xl font-semibold text-slate-900">
                          Новый продукт
                        </h2>
                        <p className="text-sm text-slate-500">
                          Заполните ключевые параметры и прикрепите фотографии.
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        onClick={() => setFormOpen(false)}
                        type="button"
                        className="text-sm text-slate-500 hover:text-slate-900"
                      >
                        Свернуть
                      </Button>
                    </div>

                    <Form {...form}>
                      <form onSubmit={onSubmit} className="mt-6 grid gap-6">
                        <div className="grid gap-6 md:grid-cols-2">
                          <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Название</FormLabel>
                                <FormControl>
                                  <Input
                                    value={field.value}
                                    onChange={field.onChange}
                                    onBlur={field.onBlur}
                                    name={field.name}
                                    placeholder="Aurora Glow Balloon"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="price"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Цена (€)</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    inputMode="decimal"
                                    step="0.1"
                                    min="0"
                                    value={field.value}
                                    onChange={field.onChange}
                                    onBlur={field.onBlur}
                                    name={field.name}
                                    placeholder="6.50"
                                  />
                                </FormControl>
                                <FormDescription>
                                  Цена указывается в евро. Можно использовать
                                  запятую или точку.
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="categoryGroup"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Группа</FormLabel>
                                <Select
                                  value={field.value}
                                  onValueChange={(value) =>
                                    field.onChange(value)
                                  }
                                >
                                  <FormControl>
                                    <SelectTrigger className="w-full">
                                      <SelectValue placeholder="Выберите группу" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {PRODUCT_CATEGORY_GROUPS.map((group) => (
                                      <SelectItem
                                        key={group.value}
                                        value={group.value}
                                      >
                                        {group.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="size"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Размер</FormLabel>
                                <Select
                                  value={field.value}
                                  onValueChange={(value) =>
                                    field.onChange(value as BalloonSize)
                                  }
                                >
                                  <FormControl>
                                    <SelectTrigger className="w-full">
                                      <SelectValue placeholder="Размер" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {SIZE_OPTIONS.map((size) => (
                                      <SelectItem key={size} value={size}>
                                        {size}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="category"
                            render={({ field }) => (
                              <FormItem className="md:col-span-2">
                                <FormLabel>Категория</FormLabel>
                                {categoryOptions.length > 0 ? (
                                  <Select
                                    value={field.value}
                                    onValueChange={field.onChange}
                                  >
                                    <FormControl>
                                      <SelectTrigger className="w-full">
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
                                ) : (
                                  <FormControl>
                                    <Input
                                      value={fallbackCategory}
                                      readOnly
                                      name={field.name}
                                    />
                                  </FormControl>
                                )}
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={form.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Описание</FormLabel>
                              <FormControl>
                                <Textarea
                                  rows={4}
                                  value={field.value}
                                  onChange={field.onChange}
                                  onBlur={field.onBlur}
                                  name={field.name}
                                  placeholder="Уникальные особенности, сценарии использования, материалы..."
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
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Статус наличия</FormLabel>
                                <Select
                                  value={field.value ? "in" : "out"}
                                  onValueChange={(value) =>
                                    field.onChange(value === "in")
                                  }
                                >
                                  <FormControl>
                                    <SelectTrigger className="w-full">
                                      <SelectValue placeholder="Выберите статус" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="in">
                                      В наличии
                                    </SelectItem>
                                    <SelectItem value="out">
                                      Нет на складе
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="isPersonalizable"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Персонализация</FormLabel>
                                <Select
                                  value={field.value ? "yes" : "no"}
                                  onValueChange={(value) =>
                                    field.onChange(value === "yes")
                                  }
                                >
                                  <FormControl>
                                    <SelectTrigger className="w-full">
                                      <SelectValue placeholder="Персонализация" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="yes">
                                      Возможна
                                    </SelectItem>
                                    <SelectItem value="no">
                                      Не требуется
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormDescription>
                                  Можно ли добавить текст, цвет или номер.
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={form.control}
                          name="availableColors"
                          render={({ field }) => {
                            const selected = field.value ?? [];

                            const toggleColor = (colorName: string) => {
                              if (selected.includes(colorName)) {
                                field.onChange(
                                  selected.filter((item) => item !== colorName),
                                );
                                return;
                              }
                              field.onChange([...selected, colorName]);
                            };

                            return (
                              <FormItem>
                                <FormLabel>Популярные цвета</FormLabel>
                                <FormControl>
                                  <div className="flex flex-wrap gap-2">
                                    {BALLOON_COLORS.map((color) => {
                                      const active = selected.includes(
                                        color.name,
                                      );
                                      return (
                                        <button
                                          key={color.name}
                                          type="button"
                                          onClick={() =>
                                            toggleColor(color.name)
                                          }
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
                                <FormDescription>
                                  Выберите до 8 оттенков, которые есть в
                                  наличии.
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            );
                          }}
                        />

                        <div className="flex items-center justify-end gap-3">
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                              form.reset(productDefaultValues);
                              resetImages();
                              setFormOpen(false);
                            }}
                          >
                            Отмена
                          </Button>
                          <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? "Сохраняем..." : "Сохранить товар"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-8 text-center shadow-sm">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-900/5 text-2xl">
                      🎈
                    </div>
                    <h2 className="text-lg font-semibold text-slate-900">
                      Добавьте первый товар
                    </h2>
                    <p className="mt-2 text-sm text-slate-500">
                      Нажмите на кнопку «+ Товар», чтобы открыть расширенную
                      форму с изображениями и характеристиками.
                    </p>
                    <Button className="mt-5" onClick={() => setFormOpen(true)}>
                      + Товар
                    </Button>
                  </div>
                )}

                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-slate-900">
                      Каталог
                    </h3>
                    <span className="text-sm text-slate-500">
                      {productMetrics.total} позиций
                    </span>
                  </div>

                  {productsResult === undefined ? (
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {Array.from({ length: 6 }).map((_, index) => (
                        <div
                          key={`product-skeleton-${index.toString()}`}
                          className="animate-pulse rounded-2xl border border-slate-200 bg-white/70 p-5"
                        >
                          <div className="mb-4 h-48 rounded-xl bg-slate-200" />
                          <div className="mb-2 h-4 rounded bg-slate-200" />
                          <div className="h-3 rounded bg-slate-200" />
                        </div>
                      ))}
                    </div>
                  ) : products.length === 0 ? (
                    <div className="rounded-2xl border border-slate-200 bg-white/70 p-10 text-center text-slate-500">
                      Пока нет товаров — самое время добавить первые позиции.
                    </div>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {products.map((product) => (
                        <div
                          key={product._id}
                          className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                        >
                          <div className="relative mb-4 aspect-4/3 overflow-hidden rounded-xl bg-slate-100">
                            {product.primaryImageUrl ? (
                              <Image
                                src={product.primaryImageUrl}
                                alt={product.name}
                                fill
                                sizes="(min-width: 1280px) 20vw, (min-width: 768px) 30vw, 90vw"
                                className="object-cover transition group-hover:scale-105"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center text-4xl">
                                🎈
                              </div>
                            )}
                          </div>

                          <div className="flex items-center justify-between gap-3">
                            <h4 className="text-base font-semibold text-slate-900">
                              {product.name}
                            </h4>
                            <span
                              className={cn(
                                "rounded-full px-2.5 py-1 text-xs font-semibold",
                                product.inStock
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-rose-50 text-rose-700",
                              )}
                            >
                              {product.inStock ? "В наличии" : "Нет"}
                            </span>
                          </div>

                          <p className="mt-2 line-clamp-2 text-sm text-slate-600">
                            {product.description}
                          </p>

                          <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
                            <span>{product.category}</span>
                            <span>{product.size}</span>
                          </div>

                          {product.availableColors?.length ? (
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {product.availableColors?.map((color) => (
                                <span
                                  key={`${product._id}-${color}`}
                                  className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600"
                                >
                                  {color}
                                </span>
                              ))}
                            </div>
                          ) : null}

                          <div className="mt-4 flex items-center justify-between">
                            <span className="text-lg font-semibold text-slate-900">
                              {formatCurrency(product.price)}
                            </span>
                            <span className="text-xs text-slate-400">
                              #{product._id.slice(-6)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>

              <aside className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-900">
                      Фотографии товара
                    </h3>
                    {pendingImages.length ? (
                      <button
                        type="button"
                        className="text-xs text-slate-500 hover:text-slate-900"
                        onClick={resetImages}
                      >
                        Очистить
                      </button>
                    ) : null}
                  </div>

                  <div className="mt-4 space-y-3">
                    {pendingImages.length === 0 ? (
                      <label className="flex cursor-pointer flex-col items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50/70 px-4 py-6 text-center text-sm text-slate-600 transition hover:border-slate-400">
                        <div className="text-3xl">📷</div>
                        <div>
                          Перетащите файлы или{" "}
                          <span className="font-semibold text-slate-900">
                            выберите на компьютере
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">
                          До 8 изображений, максимум 6 MB каждое
                        </p>
                        <input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={handleSelectImages}
                          className="hidden"
                        />
                      </label>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        {pendingImages.map((image) => (
                          <div
                            key={image.preview}
                            className="group relative overflow-hidden rounded-xl border border-slate-200"
                          >
                            <Image
                              src={image.preview}
                              alt="Загруженное изображение"
                              width={320}
                              height={240}
                              className="h-32 w-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveImage(image.preview)}
                              className="absolute inset-x-2 bottom-2 rounded-full bg-black/60 px-2 py-1 text-xs text-white opacity-0 transition group-hover:opacity-100"
                            >
                              Удалить
                            </button>
                          </div>
                        ))}

                        {pendingImages.length < 8 ? (
                          <label className="flex h-32 cursor-pointer items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/70 text-slate-500 transition hover:border-slate-400">
                            <span className="text-sm font-medium">
                              + Добавить
                            </span>
                            <input
                              type="file"
                              multiple
                              accept="image/*"
                              onChange={handleSelectImages}
                              className="hidden"
                            />
                          </label>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4 rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm">
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase">
                      Всего товаров
                    </p>
                    <p className="mt-1 text-2xl font-semibold text-slate-900">
                      {productMetrics.total}
                    </p>
                    <p className="text-xs text-slate-500">
                      {productMetrics.available} в наличии ·{" "}
                      {productMetrics.outOfStock} нет на складе
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase">
                      Средняя цена
                    </p>
                    <p className="mt-1 text-xl font-semibold text-slate-900">
                      {productMetrics.total
                        ? formatCurrency(productMetrics.averagePrice)
                        : "—"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {productMetrics.personalizable} персонализируемых позиций
                    </p>
                  </div>
                </div>
              </aside>
            </div>
          </TabsContent>

          <TabsContent value="orders">
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm">
                  <p className="text-xs font-semibold text-slate-400 uppercase">
                    Всего заказов
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">
                    {orderMetrics.total}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm">
                  <p className="text-сlate-400 text-xs font-semibold uppercase">
                    Ожидают обработки
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-amber-600">
                    {orderMetrics.pending}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm">
                  <p className="text-сlate-400 text-xs font-semibold uppercase">
                    Доставлены
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-emerald-600">
                    {orderMetrics.delivered}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm">
                  <p className="text-сlate-400 text-xs font-semibold uppercase">
                    Выручка
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">
                    {orderMetrics.revenue
                      ? formatCurrency(orderMetrics.revenue)
                      : "—"}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm">
                <Select
                  value={statusFilter}
                  onValueChange={(value) =>
                    setStatusFilter(value as OrderStatus | "all")
                  }
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Статус" />
                  </SelectTrigger>
                  <SelectContent>
                    {ORDER_STATUS_FILTERS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={sortOrder}
                  onValueChange={(value) =>
                    setSortOrder(value as "newest" | "oldest")
                  }
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Сортировка" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Сначала новые</SelectItem>
                    <SelectItem value="oldest">Сначала старые</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white/80 shadow-sm">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-xs tracking-wide text-slate-500 uppercase">
                    <tr>
                      <th className="px-6 py-3 text-left">Заказ</th>
                      <th className="px-6 py-3 text-left">Клиент</th>
                      <th className="px-6 py-3 text-left">Состав</th>
                      <th className="px-6 py-3 text-left">Статус</th>
                      <th className="px-6 py-3 text-right">Сумма</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                    {ordersLoading ? (
                      <tr>
                        <td colSpan={5} className="текст-center px-6 py-12">
                          <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />
                          <p className="mt-3 text-sm text-slate-500">
                            Загружаем список заказов...
                          </p>
                        </td>
                      </tr>
                    ) : orders.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-6 py-12 text-center text-slate-500"
                        >
                          Заказы пока не оформлены или доступ к ним ограничен.
                        </td>
                      </tr>
                    ) : (
                      orders.map((order) => (
                        <tr key={order._id} className="hover:bg-slate-50/60">
                          <td className="px-6 py-4 font-semibold whitespace-nowrap text-slate-900">
                            #{order._id.slice(-6)}
                            <div className="text-xs font-normal text-slate-400">
                              {formatDateTime(order._creationTime)}
                            </div>
                          </td>
                          <td className="max-w-[220px] px-6 py-4">
                            <div className="font-medium">
                              {order.customerName}
                            </div>
                            <div className="text-xs text-slate-400">
                              {order.customerEmail}
                            </div>
                          </td>
                          <td className="max-w-[280px] px-6 py-4 text-sm text-slate-600">
                            {order.items.slice(0, 2).map((item, idx) => (
                              <span
                                key={`${order._id}-${item.productId}-${idx}`}
                              >
                                {item.productName} ×{item.quantity}
                                {idx < order.items.slice(0, 2).length - 1
                                  ? ", "
                                  : ""}
                              </span>
                            ))}
                            {order.items.length > 2 ? (
                              <span className="text-xs text-slate-400">
                                {" "}
                                + ещё {order.items.length - 2}
                              </span>
                            ) : null}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={cn(
                                "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
                                ORDER_STATUS_META[order.status].tone,
                              )}
                            >
                              {ORDER_STATUS_META[order.status].label}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right font-semibold whitespace-nowrap text-slate-900">
                            {formatCurrency(order.totalAmount)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="insights">
            <div className="rounded-2xl border border-slate-200 bg-white/80 p-10 text-center shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">
                Аналитика в разработке
              </h3>
              <p className="mt-3 text-sm text-slate-500">
                Здесь появятся отчёты по динамике продаж, популярным категориям
                и повторным покупкам. Следите за обновлениями.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
