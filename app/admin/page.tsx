"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useAction, useMutation } from "convex/react";
import { useQuery } from "convex-helpers/react/cache";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type FieldErrors, type Path, useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CategoryGroupValue } from "@/constants/categories";
import { PRODUCT_CATEGORY_GROUPS } from "@/constants/categories";
import { uploadFileInChunks } from "@/lib/chunkedUploadClient";
import { api } from "../../convex/_generated/api";
import type { Doc } from "../../convex/_generated/dataModel";
import {
  type AdminPaymentListItem,
  EmptyProductsState,
  ORDER_STATUS_FILTERS,
  OrderMetricsCards,
  type OrderStatus,
  OrdersTable,
  type PendingImage,
  ProductCard,
  type ProductCardData,
  ProductForm,
  type ProductFormValues,
  ProductMetricsCard,
  PaymentsTab,
  productFormSchema,
  type StripePaymentListItem,
  type UploadProgressState,
} from "./_components";

const DEFAULT_CATEGORY_GROUP = PRODUCT_CATEGORY_GROUPS[0];
const getFallbackCategories = (groupValue: CategoryGroupValue): string[] => {
  const group = PRODUCT_CATEGORY_GROUPS.find(
    (candidate) => candidate.value === groupValue,
  );
  if (!group) {
    return [];
  }
  if (group.subcategories.length === 0) {
    return group.categoryValue ? [group.categoryValue] : [];
  }
  const first = group.subcategories[0];
  return first?.value ? [first.value] : [];
};

const DEFAULT_CATEGORIES = getFallbackCategories(DEFAULT_CATEGORY_GROUP.value);

const buildProductDefaultValues = (): ProductFormValues => ({
  name: "",
  description: "",
  price: "",
  categoryGroup: DEFAULT_CATEGORY_GROUP.value,
  categories: [...DEFAULT_CATEGORIES],
  inStock: true,
  isPersonalizable: { name: false, number: false },
  availableColors: [],
});

export default function AdminPage() {
  const router = useRouter();
  const user = useQuery(api.auth.loggedInUser);

  const [activeTab, setActiveTab] = useState<
    "products" | "orders" | "payments" | "insights"
  >("products");
  const [formOpen, setFormOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);
  const [editingProductId, setEditingProductId] = useState<
    Doc<"products">["_id"] | null
  >(null);
  const [uploadProgress, setUploadProgress] =
    useState<UploadProgressState | null>(null);
  const [stripePayments, setStripePayments] = useState<
    StripePaymentListItem[] | null
  >(null);
  const [isStripeLoading, setIsStripeLoading] = useState(false);
  const [stripeError, setStripeError] = useState<string | null>(null);

  const previewUrlsRef = useRef<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formPanelRef = useRef<HTMLDivElement>(null);

  const createProduct = useMutation(api.products.create);
  const updateProduct = useMutation(api.products.update);
  const listStripePayments = useAction(api.payments.listStripePayments);

  const productsResult = useQuery(api.products.list, {
    order: "createdAt-desc",
    paginationOpts: { numItems: 100, cursor: null },
  });

  const ordersResult = useQuery(api.orders.listAll, {
    status: statusFilter === "all" ? undefined : statusFilter,
    sort: sortOrder,
  });

  const paymentsResult = useQuery(api.paymentsAdmin.list, {
    limit: 40,
  }) as AdminPaymentListItem[] | undefined;

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: buildProductDefaultValues(),
  });

  const categoryGroup = form.watch("categoryGroup");
  const isEditing = editingProductId !== null;

  const isCheckingAccess = user === undefined;
  const isAdmin = user?.isAdmin === true;
  const scrollAnchor = formOpen ? (editingProductId ?? "__create__") : null;

  // Client-side admin guard: redirect non-admins to home
  useEffect(() => {
    if (isCheckingAccess) {
      return; // still loading
    }
    if (!isAdmin) {
      router.replace("/");
    }
  }, [isAdmin, isCheckingAccess, router]);

  useEffect(() => {
    if (!scrollAnchor || !formPanelRef.current) {
      return;
    }
    formPanelRef.current.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [scrollAnchor]);

  useEffect(() => {
    const group = PRODUCT_CATEGORY_GROUPS.find(
      (item) => item.value === (categoryGroup as CategoryGroupValue),
    );
    if (!group) {
      return;
    }

    const currentCategories = form.getValues("categories") ?? [];
    if (group.subcategories.length === 0) {
      const fallback = group.categoryValue ? [group.categoryValue] : [];
      if (
        fallback.length > 0 &&
        (currentCategories.length !== fallback.length ||
          currentCategories[0] !== fallback[0])
      ) {
        form.setValue("categories", fallback, { shouldDirty: true });
      }
      return;
    }

    const allowed = new Set(
      group.subcategories.map((subcategory) => subcategory.value),
    );
    const sanitized = currentCategories.filter((category) =>
      allowed.has(category),
    );
    const nextCategories = sanitized.length
      ? sanitized
      : group.subcategories[0]
        ? [group.subcategories[0].value]
        : [];

    if (nextCategories.length === 0) {
      return;
    }

    const changed =
      nextCategories.length !== currentCategories.length ||
      nextCategories.some(
        (category, index) => currentCategories[index] !== category,
      );

    if (changed) {
      form.setValue("categories", nextCategories, { shouldDirty: true });
    }
  }, [categoryGroup, form]);

  const products = (productsResult?.page ?? []) as ProductCardData[];
  const ordersLoading = ordersResult === undefined;
  const orders = ordersResult ?? [];
  const convexPayments = paymentsResult ?? [];
  const paymentsLoading = paymentsResult === undefined;

  const refreshStripePayments = useCallback(async () => {
    if (!isAdmin) {
      return;
    }
    setIsStripeLoading(true);
    setStripeError(null);
    try {
      const data = await listStripePayments({ limit: 20 });
      setStripePayments(data);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Не удалось загрузить Stripe платежи";
      setStripeError(message);
      toast.error(message);
    } finally {
      setIsStripeLoading(false);
    }
  }, [isAdmin, listStripePayments]);

  useEffect(() => {
    if (!isAdmin) {
      return;
    }
    void refreshStripePayments();
  }, [isAdmin, refreshStripePayments]);

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
      (product) =>
        product.isPersonalizable?.name || product.isPersonalizable?.number,
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

    const availableSlots = Math.max(
      0,
      8 - (existingImageUrls.length + pendingImages.length),
    );
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

  const handleRemoveExistingImage = (url: string) => {
    setExistingImageUrls((prev) => prev.filter((item) => item !== url));
  };

  const handleCollapseForm = () => {
    form.reset(buildProductDefaultValues());
    resetImages();
    setEditingProductId(null);
    setFormOpen(false);
  };

  const startCreateFlow = () => {
    setActiveTab("products");
    setEditingProductId(null);
    form.reset(buildProductDefaultValues());
    resetImages();
    setFormOpen(true);
  };

  const handleEditProduct = (product: ProductCardData) => {
    setActiveTab("products");
    setFormOpen(true);
    setEditingProductId(product._id);
    resetImages({ preserveExisting: true });
    form.reset({
      name: product.name,
      description: product.description,
      price: String(product.price),
      categoryGroup: product.categoryGroup,
      categories: product.categories?.length
        ? [...product.categories]
        : getFallbackCategories(product.categoryGroup as CategoryGroupValue),
      inStock: product.inStock,
      isPersonalizable: product.isPersonalizable ?? {
        name: false,
        number: false,
      },
      availableColors: product.availableColors ?? [],
    });
    setExistingImageUrls(product.imageUrls ?? []);
  };

  const resetImages = (options?: { preserveExisting?: boolean }) => {
    previewUrlsRef.current.forEach((url) => {
      URL.revokeObjectURL(url);
    });
    previewUrlsRef.current = [];
    setPendingImages([]);
    if (!options?.preserveExisting) {
      setExistingImageUrls([]);
    }
    setUploadProgress(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleValidSubmit = async (values: ProductFormValues) => {
    setIsSubmitting(true);
    const shouldTrackUpload = pendingImages.length > 0;
    try {
      const uploadedImageUrls: string[] = [];
      const totalBytes = pendingImages.reduce(
        (acc, pending) => acc + pending.file.size,
        0,
      );
      const folder =
        process.env.NEXT_PUBLIC_IMAGEKIT_PRODUCTS_FOLDER ?? "/products";
      let completedBytes = 0;

      if (shouldTrackUpload) {
        setUploadProgress({
          status: "preparing",
          percentage: 0,
          message: "Подготавливаем загрузку...",
        });
      }

      for (const pending of pendingImages) {
        const result = await uploadFileInChunks(pending.file, {
          folder,
          onProgress: (fileProgress) => {
            if (!shouldTrackUpload) {
              return;
            }
            const combinedUploaded =
              completedBytes +
              Math.min(pending.file.size, fileProgress.uploadedBytes);
            const basePercentage =
              totalBytes > 0
                ? Math.min(
                    fileProgress.phase === "finalizing" ? 100 : 99,
                    Math.round((combinedUploaded / totalBytes) * 100),
                  )
                : 100;
            const status: UploadProgressState["status"] =
              fileProgress.phase === "finalizing" ? "finalizing" : "uploading";
            setUploadProgress({
              status,
              percentage: basePercentage,
              message:
                status === "finalizing"
                  ? `Финализируем ${pending.file.name}`
                  : `Загружаем ${pending.file.name}`,
            });
          },
        });

        completedBytes += pending.file.size;

        if (shouldTrackUpload) {
          const completedPercentage =
            totalBytes > 0
              ? Math.min(99, Math.round((completedBytes / totalBytes) * 100))
              : 100;
          setUploadProgress({
            status: "uploading",
            percentage: completedPercentage,
            message: `Файл ${pending.file.name} загружен`,
          });
        }

        uploadedImageUrls.push(result.url);
      }

      if (shouldTrackUpload) {
        setUploadProgress({
          status: "success",
          percentage: 100,
          message: "Все изображения загружены",
        });
      }

      const numericPrice = Number(values.price.replace(",", "."));
      const sanitizedCategories = values.categories
        .map((category) => category.trim())
        .filter((category) => category.length > 0);
      const fallbackCategories = getFallbackCategories(
        values.categoryGroup as CategoryGroupValue,
      );
      const normalizedCategories = sanitizedCategories.length
        ? sanitizedCategories
        : fallbackCategories;
      const payload = {
        name: values.name.trim(),
        description: values.description.trim(),
        price: numericPrice,
        categoryGroup: values.categoryGroup,
        categories: normalizedCategories,
        imageUrls: [...existingImageUrls, ...uploadedImageUrls],
        inStock: values.inStock,
        isPersonalizable: values.isPersonalizable,
        availableColors: values.availableColors.length
          ? values.availableColors
          : undefined,
      };

      if (isEditing && editingProductId) {
        await updateProduct({
          productId: editingProductId,
          ...payload,
        });
        toast.success("Товар обновлён");
      } else {
        await createProduct(payload);
        toast.success("Товар сохранён");
      }

      form.reset(buildProductDefaultValues());
      resetImages();
      setEditingProductId(null);
      setFormOpen(false);
    } catch (error) {
      if (shouldTrackUpload) {
        setUploadProgress((prev) => ({
          status: "error",
          percentage: prev?.percentage ?? 0,
          message:
            error instanceof Error
              ? error.message
              : "Не удалось загрузить изображения",
        }));
      }
      console.error(error);
      toast.error(
        error instanceof Error
          ? error.message
          : isEditing
            ? "Не удалось обновить товар"
            : "Не удалось создать товар",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInvalidSubmit = (errors: FieldErrors<ProductFormValues>) => {
    // Get all error entries
    const errorEntries = Object.entries(errors);

    if (errorEntries.length === 0) {
      return;
    }

    // Focus on the first field with an error
    const [firstFieldName] = errorEntries[0] as [
      Path<ProductFormValues>,
      unknown,
    ];
    form.setFocus(firstFieldName);

    // Show individual toast for each field error
    errorEntries.forEach(([fieldName, error]) => {
      if (error && typeof error === "object" && "message" in error) {
        const message = error.message as string;
        if (message) {
          toast.error(message, {
            description: `Поле: ${getFieldLabel(fieldName)}`,
          });
        }
      }
    });
  };

  const getFieldLabel = (fieldName: string): string => {
    const labels: Record<string, string> = {
      name: "Название",
      description: "Описание",
      price: "Цена",
      categoryGroup: "Группа",
      categories: "Категории",
      availableColors: "Цвета",
      inStock: "Статус наличия",
      "isPersonalizable.name": "Персонализация имени",
      "isPersonalizable.number": "Персонализация цифры",
    };
    return labels[fieldName] || fieldName;
  };

  // Avoid flashing admin UI while deciding access
  if (isCheckingAccess) {
    return null;
  }

  if (!isAdmin) {
    return null;
  }

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
            setActiveTab(
              value as "products" | "orders" | "payments" | "insights",
            )
          }
          className="space-y-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <TabsList>
              <TabsTrigger value="products">Товары</TabsTrigger>
              <TabsTrigger value="orders">Заказы</TabsTrigger>
              <TabsTrigger value="payments">Платежи</TabsTrigger>
              <TabsTrigger value="insights">Аналитика</TabsTrigger>
            </TabsList>

            <Button onClick={startCreateFlow}>+ Товар</Button>
          </div>

          <TabsContent value="products">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="space-y-6">
                {formOpen ? (
                  <div ref={formPanelRef}>
                    <ProductForm
                      form={form}
                      isEditing={isEditing}
                      isSubmitting={isSubmitting}
                      existingImageUrls={existingImageUrls}
                      pendingImages={pendingImages}
                      fileInputRef={fileInputRef}
                      onSubmit={handleValidSubmit}
                      onError={handleInvalidSubmit}
                      onCancel={() => {
                        form.reset(buildProductDefaultValues());
                        resetImages();
                        setFormOpen(false);
                      }}
                      onSelectImages={handleSelectImages}
                      onRemoveImage={handleRemoveImage}
                      onRemoveExistingImage={handleRemoveExistingImage}
                      onClearImages={() => resetImages()}
                      onCollapse={handleCollapseForm}
                      uploadProgress={uploadProgress}
                    />
                  </div>
                ) : (
                  <EmptyProductsState
                    onCreateProduct={() => setFormOpen(true)}
                  />
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
                    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                      {products.map((product) => (
                        <ProductCard
                          key={product._id}
                          product={product}
                          onClick={handleEditProduct}
                        />
                      ))}
                    </div>
                  )}
                </section>
              </div>

              <aside className="space-y-4">
                <ProductMetricsCard metrics={productMetrics} />
              </aside>
            </div>
          </TabsContent>

          <TabsContent value="orders">
            <div className="space-y-6">
              <OrderMetricsCards metrics={orderMetrics} />

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

              <OrdersTable orders={orders} isLoading={ordersLoading} />
            </div>
          </TabsContent>

          <TabsContent value="payments">
            <PaymentsTab
              convexPayments={convexPayments}
              convexLoading={paymentsLoading}
              stripePayments={stripePayments}
              stripeLoading={isStripeLoading}
              stripeError={stripeError}
              onReloadStripe={refreshStripePayments}
            />
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
