"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  type Preloaded,
  useAction,
  useMutation,
  usePreloadedQuery,
} from "convex/react";
import { useQuery } from "convex-helpers/react/cache";
import { Search, SlidersHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  type FieldErrors,
  type Path,
  type Resolver,
  useForm,
} from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Calendar, CalendarDayButton } from "@/components/ui/calendar";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import Input from "@/components/ui/input";
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
import { STORE_INFO } from "@/constants/config";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { uploadImageKitFile } from "@/lib/imagekitUploadClient";
import {
  type AdminPaymentListItem,
  createProductFormSchema,
  EmptyProductsState,
  OrderDetails,
  OrderMetricsCards,
  type OrderStatus,
  OrdersTable,
  PaymentsTab,
  type PendingImage,
  ProductCard,
  type ProductCardData,
  ProductForm,
  type ProductFormValues,
  ProductMetricsCard,
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
  miniSetSizes: [],
  categoryGroup: DEFAULT_CATEGORY_GROUP.value,
  categories: [...DEFAULT_CATEGORIES],
  inStock: true,
  isPersonalizable: { name: false, number: false },
  availableColors: [],
});

interface AdminPageClientProps {
  preloadedUser: Preloaded<typeof api.auth.loggedInUser>;
}
export default function AdminPageClient({
  preloadedUser,
}: AdminPageClientProps) {
  const t = useTranslations("admin.payments");
  const tAdmin = useTranslations("admin");
  const tCommon = useTranslations("common");
  const user = usePreloadedQuery(preloadedUser);

  const [activeTab, setActiveTab] = useState<
    "products" | "orders" | "payments" | "insights"
  >("products");
  const [formOpen, setFormOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [orderSearch, setOrderSearch] = useState("");
  const [orderDateFilter, setOrderDateFilter] = useState("");
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
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

  const [productSearch, setProductSearch] = useState("");
  const [productAvailability, setProductAvailability] = useState<
    "all" | "inStock" | "outOfStock"
  >("all");
  const [productCategory, setProductCategory] = useState<string>("all");
  const [isFiltersDrawerOpen, setIsFiltersDrawerOpen] = useState(false);

  const [isOrdersFiltersDrawerOpen, setIsOrdersFiltersDrawerOpen] =
    useState(false);

  const hasActiveFilters =
    productAvailability !== "all" || productCategory !== "all";

  const hasActiveOrdersFilters =
    statusFilter !== "all" || sortOrder !== "newest" || orderDateFilter !== "";

  const clearFilters = () => {
    setProductAvailability("all");
    setProductCategory("all");
  };

  const clearOrdersFilters = () => {
    setStatusFilter("all");
    setSortOrder("newest");
    setOrderDateFilter("");
  };

  const categoryOptions = useMemo(() => {
    const options: Array<{ value: string; label: string }> = [];
    const seen = new Set<string>();

    const resolveGroupLabel = (
      groupValue: CategoryGroupValue,
      fallback: string,
    ) => {
      const maybe = tAdmin(`categoryGroups.${groupValue}`);
      return typeof maybe === "string" && !maybe.includes("categoryGroups.")
        ? maybe
        : fallback;
    };

    const resolveSubLabel = (value: string, fallback: string) => {
      const maybe = tAdmin(`subcategories.${value}`);
      return typeof maybe === "string" && !maybe.includes("subcategories.")
        ? maybe
        : fallback;
    };

    for (const group of PRODUCT_CATEGORY_GROUPS) {
      const groupLabel = resolveGroupLabel(group.value, group.label);
      for (const sub of group.subcategories) {
        if (seen.has(sub.value)) continue;
        seen.add(sub.value);
        const subLabel = resolveSubLabel(sub.value, sub.label ?? sub.value);
        options.push({
          value: sub.value,
          label: `${groupLabel} · ${subLabel}`,
        });
      }
    }

    return options;
  }, [tAdmin]);

  const previewUrlsRef = useRef<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formPanelRef = useRef<HTMLDivElement>(null);

  const createProduct = useMutation(api.products.create);
  const updateProduct = useMutation(api.products.update);
  const deleteProduct = useMutation(api.products.remove);
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

  const tProductForm = useTranslations("admin.productForm");
  const productFormSchema = useMemo(
    () => createProductFormSchema(tProductForm),
    [tProductForm],
  );

  const form = useForm<ProductFormValues>({
    defaultValues: buildProductDefaultValues(),
    resolver: zodResolver(productFormSchema) as Resolver<ProductFormValues>,
  });

  const categoryGroup = form.watch("categoryGroup");
  const isEditing = editingProductId !== null;

  const isCheckingAccess = user === undefined;
  const isAdmin = user?.isAdmin === true;
  const scrollAnchor = formOpen ? (editingProductId ?? "__create__") : null;

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

  const toStoreYmd = useCallback((value: string | number | Date): string => {
    const date = value instanceof Date ? value : new Date(value);
    return date.toLocaleDateString("en-CA", {
      timeZone: STORE_INFO.geo.timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  }, []);

  const orderDaysWithOrders = useMemo(() => {
    const days = new Set<string>();
    for (const order of orders) {
      if (typeof order.pickupDateTime === "string" && order.pickupDateTime) {
        days.add(toStoreYmd(order.pickupDateTime));
        continue;
      }
      if (typeof order._creationTime === "number") {
        days.add(toStoreYmd(order._creationTime));
      }
    }
    return days;
  }, [orders, toStoreYmd]);

  const selectedOrderDate = useMemo(() => {
    if (!orderDateFilter) return undefined;
    // Use midday to avoid timezone edge cases when constructing from YYYY-MM-DD.
    return new Date(`${orderDateFilter}T12:00:00`);
  }, [orderDateFilter]);

  const handleOrderDateSelect: (date: Date | undefined) => void = useCallback(
    (date) => {
      setOrderDateFilter(date ? toStoreYmd(date) : "");
    },
    [toStoreYmd],
  );

  const OrdersCalendarDayButton = useCallback(
    (props: React.ComponentProps<typeof CalendarDayButton>) => {
      const ymd = toStoreYmd(props.day.date);
      const hasOrders = orderDaysWithOrders.has(ymd);
      const isSelected = Boolean(props.modifiers?.selected);

      return (
        <CalendarDayButton
          {...props}
          className={[
            props.className,
            "relative",
            hasOrders && !isSelected ? "bg-accent/80" : null,
            hasOrders ? "ring-primary/30 ring-2" : null,
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {props.children}
          {hasOrders ? (
            <span className="bg-primary absolute bottom-1 left-1/2 block h-1.5 w-1.5 -translate-x-1/2 translate-y-1/3 rounded-full" />
          ) : null}
        </CalendarDayButton>
      );
    },
    [orderDaysWithOrders, toStoreYmd],
  );

  const filteredOrders = useMemo(() => {
    const rawQuery = orderSearch.trim().toLowerCase();
    const hasQuery = rawQuery.length > 0;
    const query = hasQuery
      ? rawQuery.startsWith("#")
        ? rawQuery.slice(1)
        : rawQuery
      : "";
    const queryDigits = hasQuery ? query.replace(/\D/g, "") : "";

    return orders.filter((order) => {
      if (orderDateFilter) {
        const matchesPickupDate =
          typeof order.pickupDateTime === "string" && order.pickupDateTime
            ? toStoreYmd(order.pickupDateTime) === orderDateFilter
            : false;
        const matchesCreatedDate =
          typeof order._creationTime === "number"
            ? toStoreYmd(order._creationTime) === orderDateFilter
            : false;

        if (!matchesPickupDate && !matchesCreatedDate) {
          return false;
        }
      }

      if (!hasQuery) {
        return true;
      }

      const id = String(order._id).toLowerCase();
      const idNormalized = id.startsWith("#") ? id.slice(1) : id;
      const name = String(order.customerName ?? "").toLowerCase();
      const email = String(order.customerEmail ?? "").toLowerCase();
      const phone = String(
        (order as unknown as { phone?: string | null }).phone ?? "",
      );
      const phoneDigits = phone.replace(/\D/g, "");

      if (id.includes(query) || idNormalized.includes(query)) return true;
      if (name.includes(query)) return true;
      if (email.includes(query)) return true;

      if (queryDigits.length >= 3 && phoneDigits.includes(queryDigits))
        return true;
      if (phone.toLowerCase().includes(query)) return true;

      return false;
    });
  }, [orderDateFilter, orderSearch, orders, toStoreYmd]);
  const convexPayments = paymentsResult ?? [];
  const paymentsLoading = paymentsResult === undefined;

  const filteredProducts = useMemo(() => {
    const query = productSearch.trim().toLowerCase();
    return products.filter((product) => {
      if (query && !product.name.toLowerCase().includes(query)) {
        return false;
      }
      if (productAvailability === "inStock" && !product.inStock) {
        return false;
      }
      if (productAvailability === "outOfStock" && product.inStock) {
        return false;
      }

      const categories = product.categories ?? [];
      if (productCategory !== "all" && !categories.includes(productCategory)) {
        return false;
      }

      return true;
    });
  }, [products, productAvailability, productCategory, productSearch]);

  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const detailsRef = useRef<HTMLDivElement | null>(null);

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
          : tAdmin("toasts.stripePaymentsLoadFailed");
      setStripeError(message);
      toast.error(message);
    } finally {
      setIsStripeLoading(false);
    }
  }, [isAdmin, listStripePayments, tAdmin]);

  useEffect(() => {
    // Stripe fetch is expensive and requires auth; only load when Payments tab is open.
    if (!isAdmin || activeTab !== "payments") {
      return;
    }
    void refreshStripePayments();
  }, [activeTab, isAdmin, refreshStripePayments]);

  useEffect(() => {
    if (activeTab !== "orders") {
      setSelectedOrderId(null);
    }
  }, [activeTab]);

  useEffect(() => {
    if (!selectedOrderId) return;
    // Scroll the aside/details panel into view when an order is selected
    // Apply a 56px offset so the panel sits slightly below the top (e.g., for a fixed header)
    const el = detailsRef.current;
    if (!el || typeof window === "undefined") return;
    const offset = 56;
    const targetY = Math.max(
      0,
      el.getBoundingClientRect().top + window.scrollY - offset,
    );
    window.scrollTo({ top: targetY, behavior: "smooth" });
  }, [selectedOrderId]);

  useEffect(() => {
    if (!selectedOrderId) return;
    if (!filteredOrders.some((order) => order._id === selectedOrderId)) {
      setSelectedOrderId(null);
    }
  }, [filteredOrders, selectedOrderId]);

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
      return {
        total: 0,
        pending: 0,
        confirmed: 0,
        shipped: 0,
        delivered: 0,
        revenue: 0,
      };
    }

    const pending = orders.filter((o) => o.status === "pending").length;
    const confirmed = orders.filter((o) => o.status === "confirmed").length;
    const shipped = orders.filter((o) => o.status === "shipped").length;
    const delivered = orders.filter((o) => o.status === "delivered").length;
    const revenue = orders.reduce(
      (acc, o) => acc + (o.grandTotal ?? o.totalAmount),
      0,
    );

    return {
      total: orders.length,
      pending,
      confirmed,
      shipped,
      delivered,
      revenue,
    };
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
      toast.info(tAdmin("toasts.imageLimitReached"));
      event.target.value = "";
      return;
    }

    const nextImages: PendingImage[] = [];

    for (const file of selected) {
      if (!file.type.startsWith("image/")) {
        toast.error(tAdmin("toasts.fileNotImage", { fileName: file.name }));
        continue;
      }
      if (file.size > 6 * 1024 * 1024) {
        toast.error(tAdmin("toasts.fileTooLarge", { fileName: file.name }));
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
      miniSetSizes: (product.miniSetSizes ?? []).map((entry) => ({
        label: entry.label,
        price: String(entry.price),
      })),
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

  const handleDeleteProduct = async () => {
    if (!editingProductId) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteProduct({ productId: editingProductId });
      toast.success(tAdmin("toasts.productDeleted"));
      form.reset(buildProductDefaultValues());
      resetImages();
      setEditingProductId(null);
      setFormOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : tAdmin("toasts.productDeleteFailed"),
      );
    } finally {
      setIsDeleting(false);
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
          message: tAdmin("toasts.preparingUpload"),
        });
      }

      for (const pending of pendingImages) {
        const result = await uploadImageKitFile(pending.file, {
          folder,
          onProgress: ({ loaded }) => {
            if (!shouldTrackUpload) {
              return;
            }

            const loadedBytes = Math.min(pending.file.size, loaded ?? 0);
            const combinedUploaded = completedBytes + loadedBytes;
            const rawPercentage =
              totalBytes > 0
                ? Math.round((combinedUploaded / totalBytes) * 100)
                : 100;
            const atFileEnd = loadedBytes >= pending.file.size;
            const status: UploadProgressState["status"] = atFileEnd
              ? "finalizing"
              : "uploading";
            const cappedPercentage = Math.min(
              status === "finalizing" ? 100 : 99,
              rawPercentage,
            );

            setUploadProgress({
              status,
              percentage: cappedPercentage,
              message:
                status === "finalizing"
                  ? tAdmin("toasts.finalizing", { fileName: pending.file.name })
                  : tAdmin("toasts.uploading", { fileName: pending.file.name }),
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
            message: tAdmin("toasts.fileUploaded", {
              fileName: pending.file.name,
            }),
          });
        }

        if (result.url !== undefined) {
          uploadedImageUrls.push(result.url);
        }
      }

      if (shouldTrackUpload) {
        setUploadProgress({
          status: "success",
          percentage: 100,
          message: tAdmin("toasts.allImagesUploaded"),
        });
      }

      const normalizedMiniSetSizes = (values.miniSetSizes ?? [])
        .map((entry) => ({
          label: (entry.label ?? "").trim(),
          price: Number(String(entry.price ?? "").replace(",", ".")),
        }))
        .filter(
          (entry) =>
            entry.label.length > 0 &&
            Number.isFinite(entry.price) &&
            entry.price >= 0,
        );

      const numericPrice =
        values.categoryGroup === "mini-sets" &&
        normalizedMiniSetSizes.length > 0
          ? Math.min(...normalizedMiniSetSizes.map((entry) => entry.price))
          : Number(values.price.replace(",", "."));
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
        miniSetSizes:
          values.categoryGroup === "mini-sets" &&
          normalizedMiniSetSizes.length > 0
            ? normalizedMiniSetSizes
            : undefined,
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
        toast.success(tAdmin("toasts.productUpdated"));
      } else {
        await createProduct(payload);
        toast.success(tAdmin("toasts.productSaved"));
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
              : tAdmin("toasts.imagesUploadFailed"),
        }));
      }
      console.error(error);
      toast.error(
        error instanceof Error
          ? error.message
          : isEditing
            ? tAdmin("toasts.productUpdateFailed")
            : tAdmin("toasts.productCreateFailed"),
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
            description: `${tAdmin("fieldLabel")}: ${getFieldLabel(fieldName)}`,
          });
        }
      }
    });
  };

  const getFieldLabel = (fieldName: string): string => {
    const labels: Record<string, string> = {
      name: tProductForm("name"),
      description: tProductForm("description"),
      price: tProductForm("price"),
      categoryGroup: tProductForm("group"),
      categories: tProductForm("categories"),
      availableColors: tProductForm("colors"),
      inStock: tProductForm("inStock"),
      "isPersonalizable.name": tProductForm("nameLabel"),
      "isPersonalizable.number": tProductForm("numberLabel"),
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
    <div className="min-h-screen bg-linear-to-br" data-testid="admin-dashboard">
      <div className="mx-auto w-full px-4 py-10 lg:px-8">
        <div className="mb-6 space-y-1">
          <h1 className="text-3xl font-semibold text-slate-900">
            {tAdmin("dashboardTitle")}
          </h1>
          <p className="text-sm text-slate-600">
            {tAdmin("dashboardDescription")}
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
              <TabsTrigger value="products">
                {tAdmin("tabs.products")}
              </TabsTrigger>
              <TabsTrigger value="orders">{tAdmin("tabs.orders")}</TabsTrigger>
              <TabsTrigger value="payments">
                {tAdmin("tabs.payments")}
              </TabsTrigger>
              <TabsTrigger value="insights">
                {tAdmin("tabs.insights")}
              </TabsTrigger>
            </TabsList>

            <Button onClick={startCreateFlow}>{tAdmin("addProduct")}</Button>
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
                      isDeleting={isDeleting}
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
                      onDelete={isEditing ? handleDeleteProduct : undefined}
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
                      {tAdmin("catalog")}
                    </h3>
                    <span className="text-sm text-slate-500">
                      {tAdmin("positionsCount", {
                        count: filteredProducts.length,
                      })}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                      <Input
                        value={productSearch}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setProductSearch(e.target.value)
                        }
                        placeholder={tAdmin("productFilters.searchPlaceholder")}
                        className="w-full pl-9"
                      />
                    </div>

                    <Drawer
                      open={isFiltersDrawerOpen}
                      onOpenChange={setIsFiltersDrawerOpen}
                    >
                      <DrawerTrigger asChild>
                        <Button
                          variant="outline"
                          className="flex items-center gap-2"
                        >
                          <SlidersHorizontal className="h-4 w-4" />
                          <span className="hidden sm:inline">
                            {tAdmin("productFilters.filtersButton")}
                          </span>
                          {hasActiveFilters && (
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[10px] font-medium text-white">
                              {
                                [
                                  productAvailability !== "all",
                                  productCategory !== "all",
                                ].filter(Boolean).length
                              }
                            </span>
                          )}
                        </Button>
                      </DrawerTrigger>
                      <DrawerContent>
                        <div className="mx-auto w-full max-w-md">
                          <DrawerHeader>
                            <DrawerTitle>
                              {tAdmin("productFilters.filtersTitle")}
                            </DrawerTitle>
                          </DrawerHeader>

                          <div className="space-y-6 p-4">
                            <div className="space-y-2">
                              <p className="text-sm font-medium text-slate-700">
                                {tAdmin(
                                  "productFilters.availabilityPlaceholder",
                                )}
                              </p>
                              <Select
                                value={productAvailability}
                                onValueChange={(value) =>
                                  setProductAvailability(
                                    value as "all" | "inStock" | "outOfStock",
                                  )
                                }
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">
                                    {tAdmin("productFilters.availabilityAll")}
                                  </SelectItem>
                                  <SelectItem value="inStock">
                                    {tAdmin(
                                      "productFilters.availabilityInStock",
                                    )}
                                  </SelectItem>
                                  <SelectItem value="outOfStock">
                                    {tAdmin(
                                      "productFilters.availabilityOutOfStock",
                                    )}
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <p className="text-sm font-medium text-slate-700">
                                {tAdmin("productFilters.categoryPlaceholder")}
                              </p>
                              <Select
                                value={productCategory}
                                onValueChange={(value) =>
                                  setProductCategory(value)
                                }
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">
                                    {tAdmin("productFilters.categoryAll")}
                                  </SelectItem>
                                  {categoryOptions.map((option) => (
                                    <SelectItem
                                      key={option.value}
                                      value={option.value}
                                    >
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <DrawerFooter className="flex-row gap-2">
                            <Button
                              variant="outline"
                              className="flex-1"
                              onClick={clearFilters}
                            >
                              {tAdmin("productFilters.clearFilters")}
                            </Button>
                            <DrawerClose asChild>
                              <Button className="flex-1">
                                {tCommon("close")}
                              </Button>
                            </DrawerClose>
                          </DrawerFooter>
                        </div>
                      </DrawerContent>
                    </Drawer>
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
                      {tAdmin("noProductsYet")}
                    </div>
                  ) : filteredProducts.length === 0 ? (
                    <div className="rounded-2xl border border-slate-200 bg-white/70 p-10 text-center text-slate-500">
                      {tAdmin("noProducts")}
                    </div>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                      {filteredProducts.map((product) => (
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
                <div className="relative flex-1">
                  <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                  <Input
                    value={orderSearch}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setOrderSearch(e.target.value)
                    }
                    placeholder={tAdmin("ordersFilters.searchPlaceholder")}
                    className="w-full pl-9"
                  />
                </div>

                <Drawer
                  open={isOrdersFiltersDrawerOpen}
                  onOpenChange={setIsOrdersFiltersDrawerOpen}
                >
                  <DrawerTrigger asChild>
                    <Button
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      <SlidersHorizontal className="h-4 w-4" />
                      <span className="hidden sm:inline">
                        {tAdmin("ordersFilters.filtersButton")}
                      </span>
                      {hasActiveOrdersFilters && (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[10px] font-medium text-white">
                          {
                            [
                              statusFilter !== "all",
                              sortOrder !== "newest",
                              orderDateFilter !== "",
                            ].filter(Boolean).length
                          }
                        </span>
                      )}
                    </Button>
                  </DrawerTrigger>
                  <DrawerContent>
                    <div className="mx-auto w-full max-w-md">
                      <DrawerHeader>
                        <DrawerTitle>
                          {tAdmin("ordersFilters.filtersTitle")}
                        </DrawerTitle>
                      </DrawerHeader>

                      <div className="space-y-6 p-4">
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-slate-700">
                            {tCommon("date")}
                          </p>
                          <Calendar
                            className="mx-auto flex justify-center"
                            mode="single"
                            selected={selectedOrderDate}
                            onSelect={handleOrderDateSelect}
                            components={{
                              DayButton: OrdersCalendarDayButton,
                            }}
                          />
                        </div>

                        <div className="space-y-2">
                          <p className="text-sm font-medium text-slate-700">
                            {tAdmin("statusFilter.placeholder")}
                          </p>
                          <Select
                            value={statusFilter}
                            onValueChange={(value) =>
                              setStatusFilter(value as OrderStatus | "all")
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">
                                {tAdmin("statusFilter.all")}
                              </SelectItem>
                              <SelectItem value="pending">
                                {t("orderStatus.pending")}
                              </SelectItem>
                              <SelectItem value="confirmed">
                                {t("orderStatus.confirmed")}
                              </SelectItem>
                              <SelectItem value="shipped">
                                {t("orderStatus.shipped")}
                              </SelectItem>
                              <SelectItem value="delivered">
                                {t("orderStatus.delivered")}
                              </SelectItem>
                              <SelectItem value="canceled">
                                {t("orderStatus.canceled")}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <p className="text-sm font-medium text-slate-700">
                            {tAdmin("sortPlaceholder")}
                          </p>
                          <Select
                            value={sortOrder}
                            onValueChange={(value) =>
                              setSortOrder(value as "newest" | "oldest")
                            }
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="newest">
                                {tAdmin("sortOptions.newest")}
                              </SelectItem>
                              <SelectItem value="oldest">
                                {tAdmin("sortOptions.oldest")}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <DrawerFooter className="flex-row gap-2">
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={clearOrdersFilters}
                        >
                          {tAdmin("ordersFilters.clearFilters")}
                        </Button>
                        <DrawerClose asChild>
                          <Button className="flex-1">{tCommon("close")}</Button>
                        </DrawerClose>
                      </DrawerFooter>
                    </div>
                  </DrawerContent>
                </Drawer>
              </div>

              {/* Two-column layout: orders list + details panel */}
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
                <div className="order-2 lg:order-1">
                  <OrdersTable
                    orders={filteredOrders}
                    isLoading={ordersLoading}
                    onSelect={(id) =>
                      setSelectedOrderId((prev) => (prev === id ? null : id))
                    }
                    selectedOrderId={selectedOrderId}
                  />
                </div>
                <div className="order-1 lg:order-2" ref={detailsRef}>
                  {selectedOrderId ? (
                    (() => {
                      const selected = filteredOrders.find(
                        (o) => o._id === selectedOrderId,
                      );
                      return selected ? (
                        <OrderDetails order={selected} />
                      ) : (
                        <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 text-sm text-slate-500">
                          {tAdmin("orderNotFound")}
                        </div>
                      );
                    })()
                  ) : (
                    <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 text-sm text-slate-500">
                      {tAdmin("selectOrderToViewDetails")}
                    </div>
                  )}
                </div>
              </div>
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
                {tAdmin("insightsInDevelopment")}
              </h3>
              <p className="mt-3 text-sm text-slate-500">
                {tAdmin("insightsDescription")}
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
