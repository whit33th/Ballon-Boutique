"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { upload } from "@imagekit/next";
import { useMutation } from "convex/react";
import { useQuery } from "convex-helpers/react/cache";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { api } from "../../convex/_generated/api";
import type { Doc } from "../../convex/_generated/dataModel";
import {
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
  productFormSchema,
} from "./_components";

const DEFAULT_CATEGORY_GROUP = PRODUCT_CATEGORY_GROUPS[0];
const DEFAULT_CATEGORY =
  DEFAULT_CATEGORY_GROUP.subcategories[0]?.value ??
  DEFAULT_CATEGORY_GROUP.categoryValue ??
  "";

const productDefaultValues: ProductFormValues = {
  name: "",
  description: "",
  price: "",
  categoryGroup: DEFAULT_CATEGORY_GROUP.value,
  category: DEFAULT_CATEGORY,
  inStock: true,
  isPersonalizable: true,
  availableColors: [],
};

export default function AdminPage() {
  const router = useRouter();
  const user = useQuery(api.auth.loggedInUser);

  const [activeTab, setActiveTab] = useState<
    "products" | "orders" | "insights"
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

  const previewUrlsRef = useRef<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formPanelRef = useRef<HTMLDivElement>(null);

  const createProduct = useMutation(api.products.create);
  const updateProduct = useMutation(api.products.update);

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
  const isEditing = editingProductId !== null;

  const isCheckingAccess = user === undefined;
  const isAdmin = user?.isAdmin === true;

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

  const products = (productsResult?.page ?? []) as ProductCardData[];
  const ordersLoading = ordersResult === undefined;
  const orders = ordersResult ?? [];

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
    form.reset(productDefaultValues);
    resetImages();
    setEditingProductId(null);
    setFormOpen(false);
  };

  const startCreateFlow = () => {
    setActiveTab("products");
    setEditingProductId(null);
    form.reset(productDefaultValues);
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
      category: product.category,
      inStock: product.inStock,
      isPersonalizable: product.isPersonalizable ?? false,
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
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleValidSubmit = async (values: ProductFormValues) => {
    setIsSubmitting(true);
    try {
      const uploadedImageUrls: string[] = [];

      for (const pending of pendingImages) {
        const authResponse = await fetch("/api/imagekit-auth");
        const authPayload = await authResponse.json();

        if (!authResponse.ok) {
          throw new Error(
            typeof authPayload?.error === "string"
              ? authPayload.error
              : "Не удалось получить авторизацию для загрузки",
          );
        }

        const uploadResponse = await upload({
          file: pending.file,
          fileName: pending.file.name,
          folder:
            process.env.NEXT_PUBLIC_IMAGEKIT_PRODUCTS_FOLDER ?? "/products",
          useUniqueFileName: true,
          publicKey: authPayload.publicKey,
          signature: authPayload.signature,
          token: authPayload.token,
          expire: authPayload.expire,
        });

        if (!uploadResponse?.url) {
          throw new Error("ImageKit не вернул ссылку на изображение");
        }

        uploadedImageUrls.push(uploadResponse.url);
      }

      const numericPrice = Number(values.price.replace(",", "."));
      const groupFallback = PRODUCT_CATEGORY_GROUPS.find(
        (entry) => entry.value === values.categoryGroup,
      );
      const normalizedCategory = values.category?.trim()
        ? values.category.trim()
        : (groupFallback?.subcategories[0]?.value ??
          groupFallback?.categoryValue ??
          "");
      const payload = {
        name: values.name.trim(),
        description: values.description.trim(),
        price: numericPrice,
        categoryGroup: values.categoryGroup,
        category: normalizedCategory,
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

      form.reset(productDefaultValues);
      resetImages();
      setEditingProductId(null);
      setFormOpen(false);
    } catch (error) {
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
      category: "Категория",
      availableColors: "Цвета",
      inStock: "Статус наличия",
      isPersonalizable: "Персонализация",
    };
    return labels[fieldName] || fieldName;
  };

  const onSubmit = form.handleSubmit(handleValidSubmit, handleInvalidSubmit);

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
                      onSubmit={onSubmit}
                      onCancel={() => {
                        form.reset(productDefaultValues);
                        resetImages();
                        setFormOpen(false);
                      }}
                      onSelectImages={handleSelectImages}
                      onRemoveImage={handleRemoveImage}
                      onRemoveExistingImage={handleRemoveExistingImage}
                      onClearImages={() => resetImages()}
                      onCollapse={handleCollapseForm}
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
