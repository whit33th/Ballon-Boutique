"use client";

import { useMutation } from "convex/react";
import { useQuery } from "convex-helpers/react/cache";

import { motion } from "motion/react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { SignOutButton } from "@/components/SignOutButton";
import { api } from "@/convex/_generated/api";

type TabId = "profile" | "orders" | "settings";

const tabs: Array<{ id: TabId; label: string; hint: string }> = [
  { id: "profile", label: "Profile", hint: "Contact details" },
  { id: "orders", label: "Orders", hint: "Purchase history" },
  { id: "settings", label: "Settings", hint: "Preferences" },
];

const tabButtonId = (tabId: TabId) => `profile-tab-${tabId}`;
const tabPanelId = (tabId: TabId) => `profile-panel-${tabId}`;

export default function ProfilePage() {
  const user = useQuery(api.auth.loggedInUser);
  const orders = useQuery(api.orders.list);
  const updateProfile = useMutation(api.users.updateProfile);

  const [activeTab, setActiveTab] = useState<TabId>("profile");
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
  });

  const resetFormFromUser = useCallback(() => {
    if (!user) {
      setFormData({ name: "", email: "", phone: "", address: "" });
      return;
    }

    setFormData({
      name: user.name ?? "",
      email: user.email ?? "",
      phone: user.phone ?? "",
      address: user.address ?? "",
    });
  }, [user]);

  useEffect(() => {
    if (!isEditing) {
      resetFormFromUser();
    }
  }, [isEditing, resetFormFromUser]);

  const handleUpdateProfile = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    try {
      const updated = await updateProfile(formData);
      setFormData({
        name: updated?.name ?? "",
        email: updated?.email ?? "",
        phone: updated?.phone ?? "",
        address: updated?.address ?? "",
      });
      toast.success("Profile updated successfully!");
      setIsEditing(false);
    } catch (_error) {
      toast.error("Failed to update profile");
    }
  };

  const formattedOrders = useMemo(() => orders ?? [], [orders]);

  if (user === undefined) {
    return (
      <div className="min-h-screen">
        <div className="mx-auto grid max-w-5xl gap-6 px-4 py-16 md:grid-cols-2">
          <div className="h-60 animate-pulse rounded-3xl bg-white/70" />
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={`skeleton-${index}`}
                className="h-12 animate-pulse rounded-full bg-white/70"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen">
        <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="mb-4 text-6xl">🔒</div>
            <h2 className="mb-3 text-3xl font-semibold text-black">
              Sign in to view your profile
            </h2>
            <p className="mb-6 text-base text-black/70">
              Access saved addresses, order history, and track your balloons in
              one place.
            </p>
            <Link
              href="/auth"
              className="inline-flex h-12 items-center justify-center rounded-full bg-black px-8 text-sm font-semibold tracking-wide text-white uppercase transition hover:bg-black/90"
            >
              Go to sign in
            </Link>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-16">
      <main className="mx-auto w-full max-w-6xl px-4 pt-12">
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-[42px] bg-linear-to-br from-white via-white/95 to-white px-8 py-10 shadow-[0_40px_90px_-50px_rgba(15,23,42,0.6)]"
        >
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(255,205,220,0.35),transparent_60%)]" />
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <p className="text-xs tracking-[0.2rem] text-black/50 uppercase">
                Welcome back
              </p>
              <h1 className="text-4xl font-semibold text-black">
                {user.name ?? "Balloon Lover"}
              </h1>
              <p className="text-sm text-black/60">{user.email}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-full bg-black/5 px-4 py-2 text-xs font-medium tracking-widest text-black/60 uppercase">
                {formattedOrders.length} orders placed
              </div>
              <SignOutButton />
            </div>
          </div>
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
                className={`flex flex-col rounded-3xl border px-6 py-5 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black ${
                  isActive
                    ? "border-black bg-white shadow-[0_20px_50px_-35px_rgba(15,23,42,0.7)]"
                    : "border-black/10 bg-white/70 hover:border-black/40"
                }`}
              >
                <span className="text-xs tracking-[0.3rem] text-black/40 uppercase">
                  {tab.hint}
                </span>
                <span className="text-lg font-semibold text-black">
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
              className="grid gap-6 rounded-[36px] bg-white p-8 shadow-[0_28px_70px_-40px_rgba(15,23,42,0.55)]"
              role="tabpanel"
              id={tabPanelId("profile")}
              aria-labelledby={tabButtonId("profile")}
              tabIndex={0}
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold text-black">
                    Personal details
                  </h2>
                  <p className="text-sm text-black/60">
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
                  className="rounded-full border border-black px-5 py-2 text-xs font-semibold tracking-widest text-black uppercase transition hover:bg-black hover:text-white"
                >
                  {isEditing ? "Cancel" : "Edit"}
                </button>
              </div>

              {isEditing ? (
                <form
                  onSubmit={handleUpdateProfile}
                  className="grid gap-5 md:grid-cols-2"
                >
                  <label className="flex flex-col gap-2 text-sm text-black/60">
                    Full name
                    <input
                      value={formData.name}
                      onChange={(event) =>
                        setFormData({ ...formData, name: event.target.value })
                      }
                      className="h-12 rounded-2xl border border-black/10 px-4 text-sm font-medium text-black transition outline-none focus:border-black"
                      placeholder="Jane Balloon"
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm text-black/60">
                    Email address
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(event) =>
                        setFormData({ ...formData, email: event.target.value })
                      }
                      className="h-12 rounded-2xl border border-black/10 px-4 text-sm font-medium text-black transition outline-none focus:border-black"
                      placeholder="you@example.com"
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm text-black/60">
                    Phone number
                    <input
                      value={formData.phone}
                      onChange={(event) =>
                        setFormData({ ...formData, phone: event.target.value })
                      }
                      className="h-12 rounded-2xl border border-black/10 px-4 text-sm font-medium text-black transition outline-none focus:border-black"
                      placeholder="Include country code"
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm text-black/60 md:col-span-2">
                    Default delivery address
                    <textarea
                      value={formData.address}
                      onChange={(event) =>
                        setFormData({
                          ...formData,
                          address: event.target.value,
                        })
                      }
                      rows={4}
                      className="rounded-2xl border border-black/10 px-4 py-3 text-sm font-medium text-black transition outline-none focus:border-black"
                      placeholder="Street, city, postal code"
                    />
                  </label>
                  <div className="flex flex-wrap items-center gap-3 md:col-span-2">
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      type="submit"
                      className="inline-flex h-12 items-center justify-center rounded-full bg-black px-6 text-xs font-semibold tracking-widest text-white uppercase transition hover:bg-black/90"
                    >
                      Save changes
                    </motion.button>
                    <button
                      type="button"
                      onClick={() => {
                        resetFormFromUser();
                        setIsEditing(false);
                      }}
                      className="inline-flex h-12 items-center justify-center rounded-full border border-black px-6 text-xs font-semibold tracking-widest text-black uppercase transition hover:bg-black/5"
                    >
                      Discard
                    </button>
                  </div>
                </form>
              ) : (
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="rounded-3xl border border-black/10 bg-white/70 px-5 py-4">
                    <p className="text-xs tracking-[0.3rem] text-black/40 uppercase">
                      Full name
                    </p>
                    <p className="mt-2 text-lg font-medium text-black">
                      {user.name ?? "Not set"}
                    </p>
                  </div>
                  <div className="rounded-3xl border border-black/10 bg-white/70 px-5 py-4">
                    <p className="text-xs tracking-[0.3rem] text-black/40 uppercase">
                      Email
                    </p>
                    <p className="mt-2 text-lg font-medium text-black">
                      {user.email ?? "Not set"}
                    </p>
                  </div>
                  <div className="rounded-3xl border border-black/10 bg-white/70 px-5 py-4">
                    <p className="text-xs tracking-[0.3rem] text-black/40 uppercase">
                      Phone
                    </p>
                    <p className="mt-2 text-lg font-medium text-black">
                      {user.phone ?? (formData.phone || "Not set")}
                    </p>
                  </div>
                  <div className="rounded-3xl border border-black/10 bg-white/70 px-5 py-4 md:col-span-2">
                    <p className="text-xs tracking-[0.3rem] text-black/40 uppercase">
                      Default delivery address
                    </p>
                    <p className="mt-2 text-lg font-medium whitespace-pre-wrap text-black">
                      {user.address ?? (formData.address || "Not set")}
                    </p>
                  </div>
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
              className="grid gap-5 rounded-[36px] bg-white p-8 shadow-[0_28px_70px_-40px_rgba(15,23,42,0.55)]"
              role="tabpanel"
              id={tabPanelId("orders")}
              aria-labelledby={tabButtonId("orders")}
              tabIndex={0}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-2xl font-semibold text-black">
                  Order history
                </h2>
                <p className="text-sm text-black/60">
                  {formattedOrders.length} placed orders
                </p>
              </div>

              {orders === undefined ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div
                      key={`order-skeleton-${index}`}
                      className="h-32 animate-pulse rounded-3xl bg-white/70"
                    />
                  ))}
                </div>
              ) : formattedOrders.length === 0 ? (
                <div className="flex flex-col items-center gap-3 rounded-3xl border border-black/10 bg-white/70 px-8 py-16 text-center">
                  <div className="text-5xl">🎈</div>
                  <p className="text-lg font-medium text-black">
                    No orders yet
                  </p>
                  <p className="text-sm text-black/60">
                    Every celebration starts with a cart full of color.
                  </p>
                  <Link
                    href="/catalog"
                    className="inline-flex h-11 items-center justify-center rounded-full bg-black px-6 text-xs font-semibold tracking-widest text-white uppercase transition hover:bg-black/90"
                  >
                    Shop balloons
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {formattedOrders.map((order) => (
                    <div
                      key={order._id}
                      className="grid gap-3 rounded-3xl border border-black/10 bg-white/80 px-6 py-5 transition hover:border-black/40"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-xs tracking-[0.3rem] text-black/40 uppercase">
                            Order
                          </p>
                          <p className="text-lg font-medium text-black">
                            #{order._id.slice(-8)}
                          </p>
                        </div>
                        <div className="rounded-full bg-black px-4 py-1 text-xs font-semibold tracking-[0.2rem] text-white uppercase">
                          ${order.totalAmount.toFixed(2)}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-black/60">
                        <span>
                          {new Date(order._creationTime).toLocaleDateString()}
                        </span>
                        <span>{order.items.length} item(s)</span>
                        <span>{order.shippingAddress}</span>
                        <span className="rounded-full bg-black/5 px-3 py-1 text-xs font-semibold tracking-[0.2rem] text-black/60 uppercase">
                          {order.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          ) : null}

          {activeTab === "settings" ? (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="grid gap-6 rounded-[36px] bg-white p-8 shadow-[0_28px_70px_-40px_rgba(15,23,42,0.55)]"
              role="tabpanel"
              id={tabPanelId("settings")}
              aria-labelledby={tabButtonId("settings")}
              tabIndex={0}
            >
              <div>
                <h2 className="text-2xl font-semibold text-black">
                  Preferences
                </h2>
                <p className="text-sm text-black/60">
                  Decide what updates land in your inbox.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  { label: "Order confirmations", defaultChecked: true },
                  { label: "Shipping updates", defaultChecked: true },
                  { label: "Promotions & inspiration", defaultChecked: false },
                  { label: "Restock alerts", defaultChecked: false },
                ].map((item) => (
                  <label
                    key={item.label}
                    className="flex items-center justify-between gap-3 rounded-3xl border border-black/10 bg-white/70 px-5 py-4 text-sm text-black/70"
                  >
                    <span>{item.label}</span>
                    <input
                      type="checkbox"
                      defaultChecked={item.defaultChecked}
                      className="h-5 w-5 accent-black"
                    />
                  </label>
                ))}
              </div>

              <div className="rounded-3xl border border-black/10 bg-white/70 px-5 py-4 text-sm text-black/60">
                We respect your inbox. You can update preferences or unsubscribe
                at any time.
              </div>
            </motion.div>
          ) : null}
        </section>
      </main>
    </div>
  );
}
