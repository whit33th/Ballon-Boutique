"use client";

import { useQuery } from "convex/react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

export default function OrderConfirmationPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const order = useQuery(api.orders.getPublic, { id: orderId as Id<"orders"> });

  const handleContinueShopping = () => {
    router.push("/");
  };

  if (order === undefined) {
    return (
      <div className="bg-primary min-h-screen">
        <div className="container mx-auto px-4 py-8">
          <div className="mx-auto max-w-2xl">
            <div className="animate-pulse rounded-xl bg-white p-8 shadow-sm">
              <div className="mb-6 h-8 rounded bg-gray-200"></div>
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={`skeleton-${i}`}
                    className="h-4 rounded bg-gray-200"
                  ></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="bg-primary min-h-screen">
        <div className="container mx-auto px-4 py-16">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-4 text-6xl">❌</div>
            <h2 className="text-deep mb-2 text-2xl font-bold">
              Order not found
            </h2>
            <p className="text-deep/70 mb-6">
              The order you're looking for doesn't exist.
            </p>
            <button
              type="button"
              onClick={handleContinueShopping}
              className="btn-accent rounded-lg px-6 py-3 font-semibold"
            >
              Go to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-primary min-h-screen">
      <main className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-2xl">
          <div className="overflow-hidden rounded-xl bg-white shadow-sm">
            <div className="bg-secondary/10 p-6 text-center sm:p-8">
              <div className="mb-4 text-5xl sm:text-6xl">✅</div>
              <h2 className="text-deep mb-2 text-2xl font-bold sm:text-3xl">
                Order Confirmed!
              </h2>
              <p className="text-deep/70">
                Thank you for your purchase. Your balloons are on their way!
              </p>
            </div>

            <div className="p-4 sm:p-6">
              <div className="mb-6">
                <h3 className="text-deep mb-3 text-base font-semibold sm:text-lg">
                  Order Details
                </h3>
                <div className="bg-secondary/5 space-y-2 rounded-lg p-4">
                  <div className="flex justify-between text-sm sm:text-base">
                    <span className="text-deep/70">Order ID:</span>
                    <span className="text-deep font-mono text-xs sm:text-sm">
                      {order._id}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm sm:text-base">
                    <span className="text-deep/70">Status:</span>
                    <span className="font-semibold text-green-600 capitalize">
                      {order.status}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm sm:text-base">
                    <span className="text-deep/70">Total:</span>
                    <span className="text-deep font-bold">
                      €{order.totalAmount.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-deep mb-3 text-base font-semibold sm:text-lg">
                  Items Ordered
                </h3>
                <div className="space-y-3">
                  {order.items.map((item) => (
                    <div
                      key={item.productId}
                      className="bg-secondary/5 flex items-center justify-between rounded-lg p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-deep truncate text-sm font-medium sm:text-base">
                          {item.productName}
                        </p>
                        <p className="text-deep/70 text-xs sm:text-sm">
                          Qty: {item.quantity}
                        </p>
                      </div>
                      <p className="text-deep ml-2 text-sm font-semibold sm:text-base">
                        €{(item.price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-deep mb-3 text-base font-semibold sm:text-lg">
                  Shipping Information
                </h3>
                <div className="bg-secondary/5 rounded-lg p-4">
                  <p className="text-deep text-sm font-medium sm:text-base">
                    {order.customerName}
                  </p>
                  <p className="text-deep/70 text-sm sm:text-base">
                    {order.customerEmail}
                  </p>
                  <p className="text-deep/70 mt-2 text-sm whitespace-pre-line sm:text-base">
                    {order.shippingAddress}
                  </p>
                </div>
              </div>

              <div className="text-center">
                <button
                  type="button"
                  onClick={handleContinueShopping}
                  className="btn-accent w-full rounded-lg px-6 py-3 font-semibold transition-opacity hover:opacity-90 sm:w-auto sm:px-8"
                >
                  Continue Shopping
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
