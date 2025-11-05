"use client";

import { useMutation, useQuery } from "convex/react";
import {
  CreditCard,
  DollarSign,
  Mail,
  MapPin,
  Store,
  Truck,
  User,
  Wallet,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  getWhatsAppLink,
  STORE_INFO,
  WHATSAPP_MESSAGES,
} from "../../constants/config";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { ProductWithImage } from "../../convex/helpers/products";
import { type GuestCartItem, useGuestCart } from "../../lib/guestCart";

type PaymentMethod = "full_online" | "partial_online" | "cash";
type DeliveryType = "pickup" | "delivery";

// Cart item from server (authenticated users)
type ServerCartItem = {
  _id: Id<"cartItems">;
  _creationTime: number;
  userId: Id<"users">;
  productId: Id<"products">;
  quantity: number;
  personalization?: {
    text?: string;
    color?: string;
    number?: string;
  };
  product: ProductWithImage;
};

export default function CheckoutPage() {
  const router = useRouter();
  const user = useQuery(api.auth.loggedInUser);
  const isAuthenticated = Boolean(user);

  // Server cart
  const cartItems = useQuery(api.cart.list);
  const cartTotal = useQuery(api.cart.getTotal);
  const createOrder = useMutation(api.orders.create);
  const createGuestOrder = useMutation(api.orders.createGuest);

  // Guest cart
  const {
    items: guestItems,
    totalPrice: guestTotal,
    initialized: guestInitialized,
  } = useGuestCart();

  // Use appropriate cart based on authentication
  const itemsToDisplay = isAuthenticated ? cartItems : guestItems;
  const cartOnlyTotal = isAuthenticated ? (cartTotal?.total ?? 0) : guestTotal;

  // Helper to get item details regardless of cart type
  const getItemDetails = (item: ServerCartItem | GuestCartItem) => {
    if ("_id" in item) {
      // Server cart item (authenticated) - has _id field
      return {
        key: item._id,
        name: item.product.name,
        price: item.product.price,
        quantity: item.quantity,
      };
    } else {
      // Guest cart item - has productId but no _id
      return {
        key: item.productId,
        name: item.product.name,
        price: item.product.price,
        quantity: item.quantity,
      };
    }
  };

  const [formData, setFormData] = useState({
    customerName: "",
    customerEmail: user?.email || "",
    shippingAddress: "",
  });

  const [deliveryType, setDeliveryType] = useState<DeliveryType>("pickup");

  // Calculate total including delivery cost
  const deliveryCost =
    deliveryType === "delivery" ? STORE_INFO.delivery.cost : 0;
  const total = cartOnlyTotal + deliveryCost;
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("full_online");
  const [whatsappConfirmed, setWhatsappConfirmed] = useState(false);
  const [pickupDateTime, setPickupDateTime] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Email validation regex
  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Check if all required fields are filled and valid
  const isFormValid =
    formData.customerName.trim() !== "" &&
    formData.customerEmail.trim() !== "" &&
    isValidEmail(formData.customerEmail) &&
    formData.shippingAddress.trim() !== "" &&
    (deliveryType === "delivery" || pickupDateTime.trim() !== "");

  const handleWhatsAppConfirm = () => {
    const message = WHATSAPP_MESSAGES.orderConfirmation(
      formData.customerName,
      formData.customerEmail,
      formData.shippingAddress,
      deliveryType,
      pickupDateTime,
    );
    const whatsappLink = getWhatsAppLink(message);
    window.open(whatsappLink, "_blank");
    setWhatsappConfirmed(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.customerName ||
      !formData.customerEmail ||
      !formData.shippingAddress
    ) {
      toast.error("Please fill in all fields");
      return;
    }

    if (paymentMethod === "cash" && !whatsappConfirmed) {
      toast.error("Cash payment requires WhatsApp confirmation");
      return;
    }

    setIsSubmitting(true);
    try {
      let orderId: string | null = null;

      if (isAuthenticated) {
        // Authenticated user - use regular create
        orderId = await createOrder({
          ...formData,
          deliveryType,
          paymentMethod,
          whatsappConfirmed:
            paymentMethod === "cash" ? whatsappConfirmed : undefined,
          pickupDateTime:
            deliveryType === "pickup" ? pickupDateTime : undefined,
        });
      } else {
        // Guest user - use createGuest with items
        orderId = await createGuestOrder({
          ...formData,
          deliveryType,
          paymentMethod,
          whatsappConfirmed:
            paymentMethod === "cash" ? whatsappConfirmed : undefined,
          pickupDateTime:
            deliveryType === "pickup" ? pickupDateTime : undefined,
          items: guestItems.map((item) => ({
            productId: item.productId as Id<"products">,
            quantity: item.quantity,
          })),
        });
      }

      toast.success("Order placed successfully!");
      router.push(`/order-confirmation/${orderId}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to place order",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading only for authenticated users waiting for cart data
  if (isAuthenticated && (cartItems === undefined || cartTotal === undefined)) {
    return (
      <div className="bg-primary min-h-screen">
        <div className="container mx-auto px-4 py-8">
          <div className="mx-auto max-w-4xl">
            <div className="animate-pulse rounded-xl bg-white p-8 shadow-sm">
              <div className="mb-6 h-8 rounded bg-gray-200"></div>
              <div className="grid gap-8 md:grid-cols-2">
                <div className="space-y-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={`auth-skeleton-${i}`}
                      className="h-12 rounded bg-gray-200"
                    ></div>
                  ))}
                </div>
                <div className="h-64 rounded bg-gray-200"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show loading for guest users waiting for cart initialization
  if (!isAuthenticated && !guestInitialized) {
    return (
      <div className="bg-primary min-h-screen">
        <div className="container mx-auto px-4 py-8">
          <div className="mx-auto max-w-4xl">
            <div className="animate-pulse rounded-xl bg-white p-8 shadow-sm">
              <div className="mb-6 h-8 rounded bg-gray-200"></div>
              <div className="grid gap-8 md:grid-cols-2">
                <div className="space-y-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={`guest-skeleton-${i}`}
                      className="h-12 rounded bg-gray-200"
                    ></div>
                  ))}
                </div>
                <div className="h-64 rounded bg-gray-200"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Check if cart is empty
  if (!itemsToDisplay || itemsToDisplay.length === 0) {
    return (
      <div className="bg-primary min-h-screen">
        <div className="container mx-auto px-4 py-8">
          <div className="mx-auto max-w-4xl">
            <div className="rounded-xl bg-white p-8 text-center shadow-sm">
              <h2 className="text-deep mb-4 text-2xl font-bold">
                Your cart is empty
              </h2>
              <p className="text-deep/70 mb-6">
                Add some balloons to your cart before checking out
              </p>
              <button
                type="button"
                onClick={() => router.push("/catalog")}
                className="btn-accent rounded-lg px-6 py-3 font-semibold"
              >
                Browse Catalog
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-primary min-h-screen">
      <main className="container mx-auto px-4 py-4 sm:py-8">
        <div className="mx-auto max-w-4xl">
          <div className="overflow-hidden rounded-xl bg-white shadow-sm">
            <div className="border-b p-4 sm:p-6">
              <div className="flex items-center space-x-3 sm:space-x-4">
                <button
                  type="button"
                  onClick={() => router.push("/cart")}
                  className="text-deep text-sm transition-opacity hover:opacity-70 sm:text-base"
                >
                  ← Back
                </button>
                <h2 className="text-deep text-xl font-bold sm:text-2xl">
                  Checkout
                </h2>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-4 sm:p-6">
              <div className="grid gap-6 sm:gap-8 lg:grid-cols-2">
                {/* Left Column - Customer Info */}
                <div className="space-y-4 sm:space-y-6">
                  <div>
                    <h3 className="text-deep mb-3 text-base font-semibold sm:mb-4 sm:text-lg">
                      Contact Information
                    </h3>
                    <div className="space-y-3 sm:space-y-4">
                      <div>
                        <label
                          htmlFor="customerName"
                          className="text-deep mb-1.5 flex items-center gap-2 text-xs font-medium sm:mb-2 sm:text-sm"
                        >
                          <User className="h-4 w-4" />
                          Full Name
                        </label>
                        <input
                          id="customerName"
                          type="text"
                          value={formData.customerName}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              customerName: e.target.value,
                            })
                          }
                          className="focus:border-secondary focus:ring-secondary/20 w-full rounded-lg border px-3 py-2 text-base outline-none focus:ring-2 sm:px-4 sm:py-3"
                          required
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="customerEmail"
                          className="text-deep mb-1.5 flex items-center gap-2 text-xs font-medium sm:mb-2 sm:text-sm"
                        >
                          <Mail className="h-4 w-4" />
                          Email
                        </label>
                        <input
                          id="customerEmail"
                          type="email"
                          value={formData.customerEmail}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              customerEmail: e.target.value,
                            })
                          }
                          className={`focus:ring-secondary/20 w-full rounded-lg border px-3 py-2 text-base outline-none focus:ring-2 sm:px-4 sm:py-3 ${
                            formData.customerEmail &&
                            !isValidEmail(formData.customerEmail)
                              ? "border-red-500 focus:border-red-500"
                              : "focus:border-secondary"
                          }`}
                          required
                        />
                        {formData.customerEmail &&
                          !isValidEmail(formData.customerEmail) && (
                            <p className="mt-1 text-xs text-red-500">
                              Please enter a valid email address
                            </p>
                          )}
                      </div>

                      <div>
                        <label
                          htmlFor="shippingAddress"
                          className="text-deep mb-1.5 flex items-center gap-2 text-xs font-medium sm:mb-2 sm:text-sm"
                        >
                          <MapPin className="h-4 w-4" />
                          Address
                        </label>
                        <textarea
                          id="shippingAddress"
                          value={formData.shippingAddress}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              shippingAddress: e.target.value,
                            })
                          }
                          rows={3}
                          className="focus:border-secondary focus:ring-secondary/20 w-full resize-none rounded-lg border px-3 py-2 text-base outline-none focus:ring-2 sm:px-4 sm:py-3"
                          placeholder="Enter your full address"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Delivery Type */}
                  <div>
                    <h3 className="text-deep mb-2 text-base font-semibold sm:mb-3 sm:text-lg">
                      Delivery Method
                    </h3>
                    <div className="space-y-2 sm:space-y-3">
                      <label className="hover:bg-primary flex cursor-pointer items-center space-x-2 rounded-lg border p-3 transition-colors sm:space-x-3 sm:p-4">
                        <input
                          type="radio"
                          name="deliveryType"
                          value="pickup"
                          checked={deliveryType === "pickup"}
                          onChange={(e) =>
                            setDeliveryType(e.target.value as DeliveryType)
                          }
                          className="text-secondary mt-0.5 h-4 w-4 shrink-0 sm:mt-1"
                        />
                        <Store className="text-secondary mt-0.5 h-5 w-5 shrink-0 sm:mt-1 sm:h-6 sm:w-6" />
                        <div className="min-w-0 flex-1">
                          <div className="text-deep text-sm font-medium sm:text-base">
                            Self-pickup
                          </div>
                          <div className="text-deep/70 text-xs sm:text-sm">
                            {STORE_INFO.address.street},{" "}
                            {STORE_INFO.address.postalCode}{" "}
                            {STORE_INFO.address.city}
                            <br />
                            Open 24/7
                          </div>
                        </div>
                      </label>
                      <label className="hover:bg-primary flex cursor-pointer items-center space-x-2 rounded-lg border p-3 transition-colors sm:space-x-3 sm:p-4">
                        <input
                          type="radio"
                          name="deliveryType"
                          value="delivery"
                          checked={deliveryType === "delivery"}
                          onChange={(e) =>
                            setDeliveryType(e.target.value as DeliveryType)
                          }
                          className="text-secondary mt-0.5 h-4 w-4 shrink-0 sm:mt-1"
                        />
                        <Truck className="text-secondary mt-0.5 h-5 w-5 shrink-0 sm:mt-1 sm:h-6 sm:w-6" />
                        <div className="min-w-0 flex-1">
                          <div className="text-deep text-sm font-medium sm:text-base">
                            Delivery
                          </div>
                          <div className="text-deep/70 text-xs sm:text-sm">
                            Delivery to nearby cities{" "}
                            {STORE_INFO.delivery.hours} (+€
                            {STORE_INFO.delivery.cost})
                          </div>
                        </div>
                      </label>
                    </div>

                    {deliveryType === "pickup" && (
                      <div className="mt-3 sm:mt-4">
                        <label
                          htmlFor="pickupDateTime"
                          className="text-deep mb-1.5 block text-xs font-medium sm:mb-2 sm:text-sm"
                        >
                          Pickup Date & Time
                        </label>
                        <input
                          id="pickupDateTime"
                          type="datetime-local"
                          value={pickupDateTime}
                          onChange={(e) => setPickupDateTime(e.target.value)}
                          className="focus:border-secondary focus:ring-secondary/20 w-full rounded-lg border px-3 py-2 text-base outline-none focus:ring-2 sm:px-4 sm:py-3"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column - Payment & Summary */}
                <div className="space-y-4 sm:space-y-6">
                  <div>
                    <h3 className="text-deep mb-3 text-base font-semibold sm:mb-4 sm:text-lg">
                      Order Summary
                    </h3>
                    <div className="bg-secondary/5 space-y-3 rounded-lg p-3 sm:p-4">
                      {itemsToDisplay?.map((item, index) => {
                        const details = getItemDetails(item);
                        return (
                          <div
                            key={`order-item-${details.key}-${index}`}
                            className="flex items-start justify-between gap-2 sm:items-center"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-deep truncate text-sm font-medium sm:text-base">
                                {details.name}
                              </p>
                              <p className="text-deep/70 text-xs sm:text-sm">
                                Qty: {details.quantity}
                              </p>
                              {"personalization" in item &&
                                item.personalization && (
                                  <div className="mt-1 space-y-0.5 text-xs text-gray-600">
                                    {item.personalization.color && (
                                      <p>Color: {item.personalization.color}</p>
                                    )}
                                    {item.personalization.text && (
                                      <p className="italic">
                                        "{item.personalization.text}"
                                      </p>
                                    )}
                                    {item.personalization.number && (
                                      <p>
                                        Number: {item.personalization.number}
                                      </p>
                                    )}
                                  </div>
                                )}
                            </div>
                            <p className="text-deep shrink-0 text-sm font-semibold sm:text-base">
                              €{(details.price * details.quantity).toFixed(2)}
                            </p>
                          </div>
                        );
                      })}

                      <div className="mt-3 space-y-2 border-t pt-3">
                        <div className="flex items-center justify-between">
                          <span className="text-deep text-sm sm:text-base">
                            Subtotal:
                          </span>
                          <span className="text-deep text-sm font-semibold sm:text-base">
                            €{cartOnlyTotal.toFixed(2)}
                          </span>
                        </div>
                        {deliveryType === "delivery" && (
                          <div className="flex items-center justify-between">
                            <span className="text-deep text-sm sm:text-base">
                              Delivery:
                            </span>
                            <span className="text-deep text-sm font-semibold sm:text-base">
                              €{deliveryCost.toFixed(2)}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center justify-between border-t pt-2">
                          <span className="text-deep text-base font-semibold sm:text-lg">
                            Total:
                          </span>
                          <span className="text-accent text-lg font-bold sm:text-xl">
                            €{total.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Payment Method */}
                  <div>
                    <h3 className="text-deep mb-2 text-base font-semibold sm:mb-3 sm:text-lg">
                      Payment Method
                    </h3>
                    <div className="space-y-2 sm:space-y-3">
                      <label className="hover:bg-primary flex cursor-pointer items-center space-x-2 rounded-lg border p-3 transition-colors sm:space-x-3 sm:p-4">
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="full_online"
                          checked={paymentMethod === "full_online"}
                          onChange={(e) =>
                            setPaymentMethod(e.target.value as PaymentMethod)
                          }
                          className="text-secondary mt-0.5 h-4 w-4 shrink-0 sm:mt-1"
                        />
                        <CreditCard className="text-secondary mt-0.5 h-5 w-5 shrink-0 sm:mt-1 sm:h-6 sm:w-6" />
                        <div className="min-w-0 flex-1">
                          <div className="text-deep text-sm font-medium sm:text-base">
                            Full Online Payment
                          </div>
                          <div className="text-deep/70 text-xs sm:text-sm">
                            Pay the full amount online — your set will be
                            reserved immediately
                          </div>
                        </div>
                      </label>

                      <label className="hover:bg-primary flex cursor-pointer items-center space-x-2 rounded-lg border p-3 transition-colors sm:space-x-3 sm:p-4">
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="partial_online"
                          checked={paymentMethod === "partial_online"}
                          onChange={(e) =>
                            setPaymentMethod(e.target.value as PaymentMethod)
                          }
                          className="text-secondary mt-0.5 h-4 w-4 shrink-0 sm:mt-1"
                        />
                        <Wallet className="text-secondary mt-0.5 h-5 w-5 shrink-0 sm:mt-1 sm:h-6 sm:w-6" />
                        <div className="min-w-0 flex-1">
                          <div className="text-deep text-sm font-medium sm:text-base">
                            30% Deposit
                          </div>
                          <div className="text-deep/70 text-xs sm:text-sm">
                            Pay 30% online to reserve. Remaining amount paid in
                            cash upon pickup
                          </div>
                        </div>
                      </label>

                      {deliveryType === "pickup" && (
                        <label className="hover:bg-primary flex cursor-pointer items-center space-x-2 rounded-lg border p-3 transition-colors sm:space-x-3 sm:p-4">
                          <input
                            type="radio"
                            name="paymentMethod"
                            value="cash"
                            checked={paymentMethod === "cash"}
                            onChange={(e) =>
                              setPaymentMethod(e.target.value as PaymentMethod)
                            }
                            className="text-secondary mt-0.5 h-4 w-4 shrink-0 sm:mt-1"
                          />
                          <DollarSign className="text-secondary mt-0.5 h-5 w-5 shrink-0 sm:mt-1 sm:h-6 sm:w-6" />
                          <div className="min-w-0 flex-1">
                            <div className="text-deep text-sm font-medium sm:text-base">
                              Cash Payment
                            </div>
                            <div className="text-deep/70 text-xs sm:text-sm">
                              Only for pickup. Requires WhatsApp confirmation
                            </div>
                          </div>
                        </label>
                      )}
                    </div>

                    {paymentMethod === "cash" && (
                      <div className="bg-warm/20 mt-3 rounded-lg border p-3 sm:mt-4 sm:p-4">
                        {!isFormValid && (
                          <p className="text-accent mb-2 text-xs font-medium sm:mb-3 sm:text-sm">
                            Please fill in all fields above to confirm via
                            WhatsApp
                          </p>
                        )}
                        {isFormValid && (
                          <p className="text-accent mb-2 text-xs font-medium sm:mb-3 sm:text-sm">
                            Click below to confirm your order via WhatsApp
                          </p>
                        )}
                        <button
                          type="button"
                          onClick={handleWhatsAppConfirm}
                          disabled={!isFormValid}
                          aria-label="Confirm via WhatsApp"
                          className="flex w-full items-center justify-center gap-3 rounded-lg bg-[#111B21] px-3 py-3 text-[#FCF5EB] shadow-md transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-row"
                        >
                          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#25D366] p-2">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              className="h-5 w-5 fill-[#FCF5EB]"
                              aria-hidden="true"
                            >
                              <title>WhatsApp</title>
                              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                            </svg>
                          </span>

                          <div className="min-w-0 flex-1 text-left">
                            <div className="text-xs">Confirm via</div>
                            <div className="truncate text-base font-bold sm:text-lg">
                              WhatsApp
                            </div>
                          </div>
                        </button>
                        {whatsappConfirmed && (
                          <p className="text-secondary mt-2 text-xs font-medium sm:text-sm">
                            ✓ WhatsApp confirmation sent
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Additional Info */}
                  <div className="bg-secondary/10 text-deep rounded-lg p-3 text-xs sm:p-4 sm:text-sm">
                    <h4 className="mb-2 text-sm font-semibold sm:text-base">
                      Additional Information:
                    </h4>
                    <ul className="space-y-1 text-xs">
                      <li>
                        • Reservation confirmed after payment or WhatsApp
                        confirmation
                      </li>
                      <li>
                        • Cancellation possible up to 48 hours before pickup
                      </li>
                      <li>• Preparation time: 72 hours (3 days)</li>
                      <li>• Contact: WhatsApp only</li>
                    </ul>
                  </div>

                  <button
                    type="submit"
                    disabled={
                      isSubmitting ||
                      (paymentMethod === "cash" && !whatsappConfirmed)
                    }
                    className="btn-accent w-full rounded-lg py-2.5 text-sm font-semibold transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:py-3 sm:text-base"
                  >
                    {isSubmitting ? "Placing Order..." : "Place Order"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
