"use client";

import { useMutation } from "convex/react";
import { useQuery } from "convex-helpers/react/cache";

import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { STORE_INFO } from "@/constants/config";
import { COURIER_DELIVERY_CITIES } from "@/constants/delivery";
import { api } from "@/convex/_generated/api";
import { useConvexAvatarStorage } from "@/hooks/useConvexAvatarStorage";
import {
  type AddressFields,
  composeAddress,
  createEmptyAddressFields,
  parseAddress,
} from "@/lib/address";
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

type ProfileFormData = {
  name: string;
  email: string;
  phone: string;
} & AddressFields;

export default function ProfilePage() {
  const user = useQuery(api.auth.loggedInUser);
  const orders = useQuery(api.orders.list, user ? {} : "skip");
  const updateProfile = useMutation(api.users.updateProfile);
  const updateAvatar = useMutation(api.users.updateAvatar);

  const [activeTab, setActiveTab] = useState<TabId>("profile");
  const [isEditing, setIsEditing] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [formData, setFormData] = useState<ProfileFormData>(() => ({
    name: "",
    email: "",
    phone: "",
    ...createEmptyAddressFields(),
  }));

  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const router = useRouter();
  const hasRedirected = useRef(false);
  const { avatarUrl, uploadAvatar } = useConvexAvatarStorage(
    user?.imageFileId ?? null,
  );

  const resetFormFromUser = useCallback(() => {
    if (!user) {
      setFormData({
        name: "",
        email: "",
        phone: "",
        ...createEmptyAddressFields(),
      });
      return;
    }

    const parsedAddress = parseAddress(user.address);

    setFormData({
      name: user.name ?? "",
      email: user.email ?? "",
      phone: user.phone ?? "",
      ...parsedAddress,
    });
  }, [user]);

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

  const handleUpdateProfile = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    try {
      const normalizedAddress = composeAddress({
        streetAddress: formData.streetAddress,
        city: formData.city,
        postalCode: formData.postalCode,
        deliveryNotes: formData.deliveryNotes,
      });

      const updated = await updateProfile({
        name: formData.name || undefined,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        address: normalizedAddress || undefined,
      });
      const parsed = parseAddress(updated?.address);
      setFormData({
        name: updated?.name ?? "",
        email: updated?.email ?? "",
        phone: updated?.phone ?? "",
        ...parsed,
      });
      toast.success("Profile updated successfully!");
      setIsEditing(false);
    } catch (_error) {
      toast.error("Failed to update profile");
    }
  };

  useEffect(() => {
    if (user === null && !hasRedirected.current) {
      hasRedirected.current = true;
      router.replace("/auth?redirect=/profile");
    }
  }, [router, user]);

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
          className={`relative overflow-hidden rounded-3xl border px-8 py-10 shadow-[0_40px_90px_-50px_rgba(15,23,42,0.35)] ${palette.softBorder} ${palette.elevatedSurface}`}
          style={{
            background:
              "linear-gradient(135deg, rgba(var(--primary-rgb),0.97) 0%, rgba(var(--support-warm-rgb),0.35) 45%, rgba(var(--secondary-rgb),0.12) 100%)",
          }}
        >
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(var(--accent-rgb),0.35),transparent_65%)]" />
          <AvatarPanel
            user={user}
            formattedOrdersCount={formattedOrders.length}
            isUploadingAvatar={isUploadingAvatar}
            avatarInputRef={avatarInputRef}
            onAvatarFileChange={handleAvatarFileChange}
            avatarUrl={avatarUrl}
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
                onClick={() => setActiveTab(tab.id)}
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
                      value={formData.name}
                      onChange={(event) =>
                        setFormData({ ...formData, name: event.target.value })
                      }
                      className={fieldInputClass}
                      placeholder="Jane Balloon"
                    />
                  </label>
                  <label className={fieldLabelClass}>
                    Email address
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(event) =>
                        setFormData({ ...formData, email: event.target.value })
                      }
                      className={fieldInputClass}
                      placeholder="you@example.com"
                    />
                  </label>
                  <label className={fieldLabelClass}>
                    Phone number
                    <input
                      value={formData.phone}
                      onChange={(event) =>
                        setFormData({ ...formData, phone: event.target.value })
                      }
                      className={fieldInputClass}
                      placeholder="Include country code"
                    />
                  </label>
                  <label className={`${fieldLabelClass} md:col-span-2`}>
                    Street & house number
                    <input
                      value={formData.streetAddress}
                      onChange={(event) =>
                        setFormData({
                          ...formData,
                          streetAddress: event.target.value,
                        })
                      }
                      className={fieldInputClass}
                      placeholder="Mariahilfer Str. 10"
                    />
                  </label>
                  <label className={fieldLabelClass}>
                    City
                    <div className="mt-2 flex flex-wrap gap-2.5">
                      {COURIER_DELIVERY_CITIES.map((city) => {
                        const selected = formData.city === city.name;
                        return (
                          <button
                            key={city.id}
                            type="button"
                            onClick={() =>
                              setFormData({ ...formData, city: city.name })
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
                      className="sr-only"
                      value={formData.city}
                      onChange={(event) =>
                        setFormData({ ...formData, city: event.target.value })
                      }
                    />
                  </label>
                  <label className={fieldLabelClass}>
                    Postal code
                    <input
                      value={formData.postalCode}
                      onChange={(event) =>
                        setFormData({
                          ...formData,
                          postalCode: event.target.value,
                        })
                      }
                      className={fieldInputClass}
                      placeholder={STORE_INFO.address.postalCode}
                    />
                  </label>
                  <label className={`${fieldLabelClass} md:col-span-2`}>
                    Delivery notes (door code, floor…)
                    <textarea
                      value={formData.deliveryNotes}
                      onChange={(event) =>
                        setFormData({
                          ...formData,
                          deliveryNotes: event.target.value,
                        })
                      }
                      rows={3}
                      className={fieldTextareaClass}
                      placeholder="Ring the bell twice, leave at reception, etc."
                    />
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
                  <InfoTile label="Full name" value={user.name ?? "Not set"} />
                  <InfoTile label="Email" value={user.email ?? "Not set"} />
                  <InfoTile
                    label="Phone"
                    value={user.phone ?? (formData.phone || "Not set")}
                  />
                  <InfoTile
                    label="Street & house number"
                    value={formData.streetAddress || "Not set"}
                  />
                  <InfoTile label="City" value={formData.city || "Not set"} />
                  <InfoTile
                    label="Postal code"
                    value={formData.postalCode || "Not set"}
                  />
                  <InfoTile
                    label="Delivery notes"
                    value={formData.deliveryNotes || "Not set"}
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
            </motion.div>
          ) : null}
        </section>
      </main>
    </div>
  );
}
