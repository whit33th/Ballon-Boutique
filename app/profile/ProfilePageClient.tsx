"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { type Preloaded, useMutation, usePreloadedQuery } from "convex/react";
import { motion } from "motion/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { STORE_INFO } from "@/constants/config";
import { COURIER_DELIVERY_CITIES } from "@/constants/delivery";
import { api } from "@/convex/_generated/api";
import { useConvexAvatarStorage } from "@/hooks/useConvexAvatarStorage";
import { createEmptyAddressFields } from "@/lib/address";
import { AvatarPanel } from "./_components/AvatarPanel";
import { InfoTile } from "./_components/InfoTile";
import { OrdersPanel } from "./_components/OrdersPanel";
import { PreferencesPanel } from "./_components/PreferencesPanel";
import {
  fieldInputClass,
  fieldLabelClass,
  fieldTextareaClass,
  palette,
} from "./_components/palette";

type TabId = "profile" | "orders" | "settings";

const tabs: Array<{ id: TabId; label: string; hint: string }> = [
  { id: "profile", label: "Profile", hint: "Contact details" },
  { id: "orders", label: "Orders", hint: "Purchase history" },
  { id: "settings", label: "Settings", hint: "Preferences" },
];

const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // 2 MB

const tabButtonId = (tabId: TabId) => `profile-tab-${tabId}`;
const tabPanelId = (tabId: TabId) => `profile-panel-${tabId}`;

const phoneRegex = /^[+]?[\d\s()-]{6,}$/;

const profileDetailsSchema = z.object({
  name: z
    .string()
    .optional()
    .refine(
      (val) => !val || val.trim().length === 0 || val.trim().length >= 2,
      {
        message: "Full name must be at least 2 characters.",
      },
    ),
  email: z
    .string()
    .optional()
    .refine(
      (val) =>
        !val ||
        val.trim().length === 0 ||
        z.string().email().safeParse(val).success,
      {
        message: "Enter a valid email address or leave the field empty.",
      },
    ),
  phone: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val || val.trim().length === 0) return true;
        const trimmed = val.trim();
        return trimmed.length <= 30 && phoneRegex.test(trimmed);
      },
      {
        message: "Phone number must be 6-30 characters and valid format.",
      },
    ),
  address: z
    .object({
      streetAddress: z
        .string()
        .refine(
          (val) =>
            !val ||
            val.trim().length === 0 ||
            (val.trim().length >= 3 && val.trim().length <= 200),
          {
            message: "Street and house number must be 3-200 characters.",
          },
        )
        .default(""),
      city: z
        .string()
        .refine(
          (val) =>
            !val ||
            val.trim().length === 0 ||
            (val.trim().length >= 2 && val.trim().length <= 100),
          {
            message: "City must be 2-100 characters.",
          },
        )
        .default(""),
      postalCode: z
        .string()
        .refine(
          (val) =>
            !val || val.trim().length === 0 || /^\d{3,10}$/.test(val.trim()),
          {
            message: "Postal code must be 3-10 digits.",
          },
        )
        .default(""),
      deliveryNotes: z
        .string()
        .refine(
          (val) => !val || val.trim().length === 0 || val.trim().length <= 500,
          {
            message: "Delivery notes must be under 500 characters.",
          },
        )
        .default(""),
    })
    .optional(),
});

type ProfileFormData = z.input<typeof profileDetailsSchema>;

interface IProfilePage {
  preloadedUser: Preloaded<typeof api.auth.loggedInUser>;
  preloadedOrders: Preloaded<typeof api.orders.list>;
}

export default function ProfilePageClient({
  preloadedUser,
  preloadedOrders,
}: IProfilePage) {
  const user = usePreloadedQuery(preloadedUser);

  const orders = usePreloadedQuery(preloadedOrders);
  const updateProfile = useMutation(api.users.updateProfile);
  const updateAvatar = useMutation(api.users.updateAvatar);
  const deleteAccount = useMutation(api.users.deleteAccount);

  const [activeTab, setActiveTab] = useState<TabId>("profile");
  const [isEditing, setIsEditing] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileDetailsSchema),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      address: createEmptyAddressFields(),
    },
  });

  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const _hasRedirected = useRef(false);
  const { uploadAvatar } = useConvexAvatarStorage(user?.imageFileId ?? null);

  const resetFormFromUser = useCallback(() => {
    if (!user) {
      form.reset({
        name: "",
        email: "",
        phone: "",
        address: createEmptyAddressFields(),
      });
      return;
    }

    const addressFields = user.address ?? createEmptyAddressFields();

    form.reset({
      name: user.name ?? "",
      email: user.email ?? "",
      phone: user.phone ?? "",
      address: addressFields,
    });
  }, [user, form]);

  useEffect(() => {
    if (!isEditing) {
      resetFormFromUser();
    }
  }, [isEditing, resetFormFromUser]);

  const handleAvatarFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) {
        return;
      }

      if (file.size > MAX_AVATAR_BYTES) {
        toast.error("Please choose an image smaller than 2 MB.");
        event.target.value = "";
        return;
      }

      setIsUploadingAvatar(true);
      try {
        const storageId = await uploadAvatar(file);
        await updateAvatar({
          imageFileId: storageId,
        });
        toast.success("Avatar updated!");
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to upload a new avatar",
        );
      } finally {
        setIsUploadingAvatar(false);
        event.target.value = "";
      }
    },
    [updateAvatar, uploadAvatar],
  );

  const handleUpdateProfile = form.handleSubmit(async (_data) => {
    try {
      // Get all form values to ensure we capture empty strings
      const formValues = form.getValues();

      const addressFields = formValues.address
        ? {
            streetAddress: formValues.address.streetAddress ?? "",
            city: formValues.address.city ?? "",
            postalCode: formValues.address.postalCode ?? "",
            deliveryNotes: formValues.address.deliveryNotes ?? "",
          }
        : createEmptyAddressFields();

      // Always send fields if they are present in the form (even if empty)
      // This allows clearing fields by sending empty strings
      // If field exists in form (even if empty), send it to allow clearing
      const phoneValue =
        formValues.phone !== undefined ? formValues.phone.trim() : undefined;
      const nameValue =
        formValues.name !== undefined ? formValues.name.trim() : undefined;

      // Email is read-only, don't send it in the update
      const updated = await updateProfile({
        name: nameValue !== undefined ? nameValue || "" : undefined,
        phone: phoneValue !== undefined ? phoneValue || "" : undefined,
        address: addressFields,
      });
      const addressFieldsFromUpdate =
        updated?.address ?? createEmptyAddressFields();
      form.reset({
        name: updated?.name ?? "",
        email: updated?.email ?? "",
        phone: updated?.phone ?? "",
        address: addressFieldsFromUpdate,
      });
      toast.success("Profile updated successfully!");
      setIsEditing(false);
    } catch (_error) {
      toast.error("Failed to update profile");
    }
  });

  // useEffect(() => {
  //   if (user === null && !hasRedirected.current) {
  //     hasRedirected.current = true;
  //     router.replace("/auth?redirect=/profile");
  //   }
  // }, [router, user]);

  // Initialise active tab from the `tab` query parameter when the
  // component mounts or when search params change. If `tab` is invalid
  // or absent, keep the default.
  useEffect(() => {
    const tabParam = searchParams.get("tab");

    if (tabParam === "orders" || tabParam === "settings") {
      setActiveTab(tabParam as TabId);
    } else {
      setActiveTab("profile");
    }
  }, [searchParams]);

  const formattedOrders = useMemo(() => orders ?? [], [orders]);

  if (user === undefined) {
    return (
      <div className="bg-primary text-deep min-h-screen">
        <div className="mx-auto grid max-w-5xl gap-6 px-4 py-16 md:grid-cols-2">
          <div className="h-60 animate-pulse rounded-3xl bg-[rgba(var(--primary-rgb),0.65)]" />
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={`skeleton-${index}`}
                className="h-12 animate-pulse rounded-full bg-[rgba(var(--secondary-rgb),0.12)]"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (user === null) {
    return (
      <div className="bg-primary text-deep flex min-h-screen items-center justify-center">
        <p className="text-deep text-sm font-medium tracking-wide uppercase">
          Redirecting to sign in...
        </p>
      </div>
    );
  }

  return (
    <div className="bg-primary text-deep min-h-screen pb-16">
      <main className="mx-auto w-full max-w-6xl px-4 pt-12">
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className={`relative overflow-hidden rounded-3xl border px-8 py-10 drop-shadow-xl ${palette.softBorder} ${palette.elevatedSurface}`}
          style={{
            background:
              "linear-gradient(135deg, rgba(var(--primary-rgb),0.97) 0%, rgba(var(--support-warm-rgb),0.35) 45%, rgba(var(--secondary-rgb),0.12) 100%)",
          }}
        >
          <AvatarPanel
            user={user}
            formattedOrdersCount={formattedOrders.length}
            isUploadingAvatar={isUploadingAvatar}
            avatarInputRef={avatarInputRef}
            onAvatarFileChange={handleAvatarFileChange}
            avatarUrl={user?.image ?? null}
          />
        </motion.section>

        <motion.nav
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mt-10 grid grid-cols-1 gap-3 text-sm sm:grid-cols-3"
          role="tablist"
          aria-label="Profile sections"
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                type="button"
                role="tab"
                id={tabButtonId(tab.id)}
                key={tab.id}
                aria-selected={isActive}
                aria-controls={tabPanelId(tab.id)}
                tabIndex={isActive ? 0 : -1}
                onClick={() => {
                  setActiveTab(tab.id);
                  // Update the URL so the active tab is preserved in history
                  // and shareable. If the 'profile' tab is selected, remove
                  // the query param entirely.
                  try {
                    if (tab.id === "profile") {
                      void router.replace("/profile");
                    } else {
                      void router.replace(`?tab=${tab.id}`);
                    }
                  } catch (_e) {
                    // ignore router errors
                  }
                }}
                onKeyDown={(event) => {
                  if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") {
                    return;
                  }
                  event.preventDefault();
                  const offset = event.key === "ArrowRight" ? 1 : -1;
                  const currentIndex = tabs.findIndex(
                    (candidate) => candidate.id === tab.id,
                  );
                  if (currentIndex === -1) {
                    return;
                  }
                  const nextIndex =
                    (currentIndex + offset + tabs.length) % tabs.length;
                  setActiveTab(tabs[nextIndex].id);
                }}
                className={`focus-visible:outline-accent flex flex-col rounded-3xl border bg-white px-6 py-5 text-left focus-visible:outline focus-visible:outline-offset-2 ${
                  isActive
                    ? "border-secondary/90"
                    : `${palette.softBorder} hover:border-secondary/40`
                }`}
              >
                <span
                  className={`text-xs tracking-[0.3rem] uppercase ${palette.subtleText}`}
                >
                  {tab.hint}
                </span>
                <span className="text-deep text-lg font-semibold">
                  {tab.label}
                </span>
              </button>
            );
          })}
        </motion.nav>

        <section className="mt-10 space-y-8">
          {activeTab === "profile" ? (
            <motion.div
              key="profile"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className={`grid gap-6 rounded-3xl border p-8 shadow-[0_28px_70px_-40px_rgba(52,137,152,0.45)] ${palette.softBorder} ${palette.elevatedSurface}`}
              role="tabpanel"
              id={tabPanelId("profile")}
              aria-labelledby={tabButtonId("profile")}
              tabIndex={0}
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-deep text-2xl font-semibold">
                    Personal details
                  </h2>
                  <p className={`text-sm ${palette.mutedText}`}>
                    Keep your contact and delivery information up to date.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (isEditing) {
                      resetFormFromUser();
                      setIsEditing(false);
                    } else {
                      resetFormFromUser();
                      setIsEditing(true);
                    }
                  }}
                  className={`rounded-full px-5 py-2 text-xs font-semibold tracking-widest uppercase transition ${
                    isEditing
                      ? `border ${palette.softBorder} text-deep hover:bg-[rgba(var(--primary-rgb),0.7)]`
                      : "btn-secondary border-none shadow-md hover:brightness-95"
                  }`}
                >
                  {isEditing ? "Cancel" : "Edit"}
                </button>
              </div>

              {isEditing ? (
                <form
                  onSubmit={handleUpdateProfile}
                  className="grid gap-5 md:grid-cols-2"
                >
                  <label className={fieldLabelClass}>
                    Full name
                    <input
                      {...form.register("name")}
                      className={fieldInputClass}
                      placeholder="Jane Balloon"
                      maxLength={100}
                    />
                    {form.formState.errors.name && (
                      <p className="mt-1 text-xs text-red-600">
                        {form.formState.errors.name.message}
                      </p>
                    )}
                  </label>
                  <label className={fieldLabelClass}>
                    Email address
                    <input
                      type="email"
                      {...form.register("email")}
                      readOnly
                      className={`${fieldInputClass} cursor-not-allowed opacity-60`}
                      placeholder="you@example.com"
                      maxLength={100}
                    />
                    {form.formState.errors.email && (
                      <p className="mt-1 text-xs text-red-600">
                        {form.formState.errors.email.message}
                      </p>
                    )}
                  </label>
                  <label className={fieldLabelClass}>
                    Phone number
                    <input
                      {...form.register("phone")}
                      className={fieldInputClass}
                      placeholder="Include country code"
                      maxLength={30}
                    />
                    {form.formState.errors.phone && (
                      <p className="mt-1 text-xs text-red-600">
                        {form.formState.errors.phone.message}
                      </p>
                    )}
                  </label>
                  <label className={`${fieldLabelClass} md:col-span-2`}>
                    Street & house number
                    <input
                      {...form.register("address.streetAddress")}
                      className={fieldInputClass}
                      placeholder="Mariahilfer Str. 10"
                      maxLength={200}
                    />
                    {form.formState.errors.address?.streetAddress && (
                      <p className="mt-1 text-xs text-red-600">
                        {form.formState.errors.address.streetAddress.message}
                      </p>
                    )}
                  </label>
                  <label className={fieldLabelClass}>
                    City
                    <div className="mt-2 flex flex-wrap gap-2.5">
                      {COURIER_DELIVERY_CITIES.map((city) => {
                        const selected =
                          form.watch("address.city") === city.name;
                        return (
                          <button
                            key={city.id}
                            type="button"
                            onClick={() =>
                              form.setValue("address.city", city.name)
                            }
                            className={`focus:outline-accent flex items-center justify-center rounded-lg border px-3 py-2 text-sm font-medium transition ${
                              selected
                                ? "border-accent bg-[rgba(var(--accent-rgb),0.08)]"
                                : `${palette.softBorder} hover:border-accent/40`
                            }`}
                          >
                            {city.name}
                          </button>
                        );
                      })}
                    </div>
                    <input
                      maxLength={100}
                      className="sr-only"
                      {...form.register("address.city")}
                    />
                    {form.formState.errors.address?.city && (
                      <p className="mt-1 text-xs text-red-600">
                        {form.formState.errors.address.city.message}
                      </p>
                    )}
                  </label>
                  <label className={fieldLabelClass}>
                    Postal code
                    <input
                      {...form.register("address.postalCode")}
                      className={fieldInputClass}
                      placeholder={STORE_INFO.address.postalCode}
                      maxLength={10}
                    />
                    {form.formState.errors.address?.postalCode && (
                      <p className="mt-1 text-xs text-red-600">
                        {form.formState.errors.address.postalCode.message}
                      </p>
                    )}
                  </label>
                  <label className={`${fieldLabelClass} md:col-span-2`}>
                    Delivery notes (door code, floor…)
                    <textarea
                      {...form.register("address.deliveryNotes")}
                      rows={3}
                      className={fieldTextareaClass}
                      placeholder="Ring the bell twice, leave at reception, etc."
                      maxLength={500}
                    />
                    {form.formState.errors.address?.deliveryNotes && (
                      <p className="mt-1 text-xs text-red-600">
                        {form.formState.errors.address.deliveryNotes.message}
                      </p>
                    )}
                  </label>
                  <div className="flex flex-wrap items-center gap-3 md:col-span-2">
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      type="submit"
                      className="bg-accent text-on-accent inline-flex h-12 items-center justify-center rounded-full px-6 text-xs font-semibold tracking-widest uppercase transition hover:brightness-95"
                    >
                      Save changes
                    </motion.button>
                    <button
                      type="button"
                      onClick={() => {
                        resetFormFromUser();
                        setIsEditing(false);
                      }}
                      className={`text-deep inline-flex h-12 items-center justify-center rounded-full border px-6 text-xs font-semibold tracking-widest uppercase transition hover:bg-[rgba(var(--primary-rgb),0.8)] ${palette.softBorder}`}
                    >
                      Discard
                    </button>
                  </div>
                </form>
              ) : (
                <div className="grid gap-6 md:grid-cols-2">
                  <InfoTile
                    label="Full name"
                    value={user.name?.trim() || "Not set"}
                  />
                  <InfoTile
                    label="Email"
                    value={user.email?.trim() || "Not set"}
                  />
                  <InfoTile
                    label="Phone"
                    value={user.phone?.trim() || "Not set"}
                  />
                  <InfoTile
                    label="Street & house number"
                    value={
                      form.watch("address.streetAddress")?.trim() || "Not set"
                    }
                  />
                  <InfoTile
                    label="City"
                    value={form.watch("address.city")?.trim() || "Not set"}
                  />
                  <InfoTile
                    label="Postal code"
                    value={
                      form.watch("address.postalCode")?.trim() || "Not set"
                    }
                  />
                  <InfoTile
                    label="Delivery notes"
                    value={
                      form.watch("address.deliveryNotes")?.trim() || "Not set"
                    }
                    fullWidth
                  />
                </div>
              )}
            </motion.div>
          ) : null}

          {activeTab === "orders" ? (
            <motion.div
              key="orders"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className={`grid gap-5 rounded-3xl border p-8 shadow-[0_28px_70px_-40px_rgba(52,137,152,0.45)] ${palette.softBorder} ${palette.elevatedSurface}`}
              role="tabpanel"
              id={tabPanelId("orders")}
              aria-labelledby={tabButtonId("orders")}
              tabIndex={0}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-deep text-2xl font-semibold">
                  Order history
                </h2>
                <p className={`text-sm ${palette.mutedText}`}>
                  {formattedOrders.length} placed orders
                </p>
              </div>
              <OrdersPanel orders={orders} />
            </motion.div>
          ) : null}

          {activeTab === "settings" ? (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className={`grid gap-6 rounded-3xl border p-8 shadow-[0_28px_70px_-40px_rgba(52,137,152,0.45)] ${palette.softBorder} ${palette.elevatedSurface}`}
              role="tabpanel"
              id={tabPanelId("settings")}
              aria-labelledby={tabButtonId("settings")}
              tabIndex={0}
            >
              <div>
                <h2 className="text-deep text-2xl font-semibold">
                  Preferences
                </h2>
                <p className={`text-sm ${palette.mutedText}`}>
                  Decide what updates land in your inbox.
                </p>
              </div>

              <PreferencesPanel />

              <div className="mt-8 border-t pt-6">
                <h3 className="text-deep mb-4 text-lg font-semibold">
                  Danger Zone
                </h3>
                <p className={`mb-4 text-sm ${palette.mutedText}`}>
                  Once you delete your account, there is no going back. Please
                  be certain.
                </p>
                <Dialog
                  open={isDeleteDialogOpen}
                  onOpenChange={setIsDeleteDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button
                      variant="destructive"
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Delete Account
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader className="space-y-2">
                      <DialogTitle>Delete Account</DialogTitle>
                      <DialogDescription>
                        Are you sure you want to delete your account? This
                        action cannot be undone. All your data will be
                        permanently removed.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setIsDeleteDialogOpen(false)}
                        disabled={isDeletingAccount}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={async () => {
                          setIsDeletingAccount(true);
                          try {
                            await deleteAccount({});
                            window.location.replace("/auth");
                          } catch (error) {
                            console.error("Failed to delete account:", error);
                            toast.error(
                              "Failed to delete account. Please try again.",
                            );
                            setIsDeletingAccount(false);
                          } finally {
                            // Refresh in case of any issues
                            window.location.reload();
                          }
                        }}
                        disabled={isDeletingAccount}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        {isDeletingAccount ? "Deleting..." : "Delete Account"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </motion.div>
          ) : null}
        </section>
      </main>
    </div>
  );
}
