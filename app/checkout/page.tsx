"use client";

import {
  getWhatsAppLink,
  STORE_INFO,
  WHATSAPP_MESSAGES,
} from "@/constants/config";
import {
  COURIER_DELIVERY_CITIES,
  type CourierDeliveryCity,
} from "@/constants/delivery";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { ProductWithImage } from "@/convex/helpers/products";
import {
  type AddressFields,
  composeAddress,
  createEmptyAddressFields,
  parseAddress,
} from "@/lib/address";
import { type GuestCartItem, useGuestCart } from "@/lib/guestCart";
import {
  CardElement,
  Elements,
  PaymentRequestButtonElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import {
  type Appearance,
  loadStripe,
  type PaymentRequest,
  type PaymentRequestPaymentMethodEvent,
} from "@stripe/stripe-js";
import { useAction, useMutation, useQuery } from "convex/react";
import {
  ArrowLeft,
  CreditCard,
  DollarSign,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Store,
  Truck,
  User,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
if (!publishableKey) {
  throw new Error("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not configured");
}

const stripePromise = loadStripe(publishableKey);

const elementsAppearance: Appearance = {
  theme: "stripe",
  variables: {
    colorPrimary: "#f15a29",
    colorBackground: "#ffffff",
    colorText: "#111827",
    colorTextSecondary: "#6b7280",
    colorDanger: "#dc2626",
    borderRadius: "14px",
    fontFamily:
      "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  rules: {
    ".Input": {
      borderColor: "#e5e7eb",
      boxShadow: "none",
    },
    ".Label": {
      color: "#111827",
      fontWeight: "600",
    },
  },
};

const steps = [
  { id: 1, title: "Details" },
  { id: 2, title: "Payment" },
];

const PAYMENT_CURRENCY = "eur";
const DISPLAY_CURRENCY = "EUR";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: DISPLAY_CURRENCY,
    maximumFractionDigits: 2,
  }).format(value);

/**
 * Calculate minimum pickup datetime (current date + minimum pickup days from config)
 */
const getMinPickupDateTime = (): string => {
  const date = new Date();
  date.setDate(date.getDate() + STORE_INFO.orderPolicy.minPickupDays);
  // Format to datetime-local format: YYYY-MM-DDTHH:mm
  return date.toISOString().slice(0, 16);
};

/**
 * Helper: turn Stripe/Convex/server errors into user-friendly English messages
 */

// biome-ignore lint/suspicious/noExplicitAny: <no type for now>
function mapStripeErrorToMessage(err: any): string {
  if (!err) {
    return "Payment couldn’t be completed. Try another card or method.";
  }
  // Normalize into a raw string for fallback cleaning
  let raw =
    typeof err === "string" ? err : (err?.message ?? JSON.stringify(err ?? ""));
  raw = String(raw || "");

  // Strip common Convex/transport prefixes and bracketed metadata that may appear
  // e.g. "[CONVEX A(stripe:submitPayment)] [Request ID: ...] Server Error Uncaught Error: ..."
  raw = raw.replace(/\[[^\]]+\]\s*/g, "");
  raw = raw.replace(/\bServer Error\b[:\s]*/i, "");
  raw = raw.replace(/\bUncaught Error:?\s*/i, "");
  raw = raw.replace(/^Uncaught:\s*/i, "");
  // Remove Convex/handler suffix like "Called by client" that can be prepended/appended
  raw = raw.replace(/\bCalled by client\b[:\s-]*/gi, "");
  // Remove accidental duplicate phrases and collapse whitespace
  raw = raw.replace(/\bCalled by client\b/gi, "");
  raw = raw.replace(/\s{2,}/g, " ").trim();

  // Try to extract structured codes from common shapes returned by Stripe / Convex
  let code: string | null = null;

  // If err is an object, check common properties first
  if (typeof err === "object" && err !== null) {
    code = (err.decline_code ||
      err.declineCode ||
      err.code ||
      err.type ||
      err.stripeCode ||
      err.error?.code ||
      err.error?.decline_code) as string | null;
    // Convex sometimes wraps details inside an `info` / `details` / `payload` property
    if (!code) {
      const maybe =
        err.info || err.details || err.payload || err.lastError || err.error;
      if (maybe && typeof maybe === "object") {
        code = (maybe.decline_code ||
          maybe.code ||
          maybe.type ||
          maybe.stripeCode) as string | null;
      }
    }
  }

  // If not found, try to parse a JSON blob from the message
  if (!code) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        code =
          parsed.decline_code ||
          parsed.code ||
          parsed.type ||
          parsed.stripeCode ||
          parsed.error?.code ||
          parsed.error?.decline_code ||
          null;
      }
    } catch (_) {
      // not JSON — ignore
    }
  }

  // Try regex fallback on the raw text for known decline codes
  if (!code) {
    const found = raw.match(
      /\b(generic_decline|insufficient_funds|lost_card|stolen_card|expired_card|incorrect_cvc|processing_error|incorrect_number|card_velocity_exceeded|card_declined)\b/i,
    );
    code = found ? found[0] : null;
  }

  switch (String(code ?? "").toLowerCase()) {
    case "insufficient_funds":
      return "Your card has insufficient funds. Try another card or contact your bank.";
    case "lost_card":
      return "This card has been reported lost. Use a different card.";
    case "stolen_card":
      return "This card was reported stolen. Use a different card.";
    case "generic_decline":
    case "card_declined":
      return "The card was declined by the issuer. Try another card or contact the bank.";
    case "expired_card":
      return "This card has expired. Use a different card.";
    case "incorrect_cvc":
      return "Incorrect CVC. Please check the three-digit code on the back of the card.";
    case "processing_error":
      return "There was a processing error. Please try again or use a different card.";
    case "incorrect_number":
      return "The card number appears incorrect. Please check and try again.";
    case "card_velocity_exceeded":
      return "Too many attempts with this card. Try again later or use another payment method.";
    default: {
      // fallback: show cleaned message without internal stack / convex codes
      // remove verbose prefixes like "Error: " or "Convex..." and strip stack traces
      let cleaned = raw
        .replace(/^error:\s*/i, "")
        .replace(/convex[:#\s]*[\w-]*/i, "")
        // remove common stack/trace sections or object dumps
        .replace(/\{.*"stack".*\}/i, "")
        .replace(/at\s+[\w./<>:-]+\s*\(.+\)/gi, "")
        .replace(/\n\s*at\s.+/gi, "")
        .trim();

      // If cleaned contains a quoted message field, extract it
      const quoted = cleaned.match(/"message"\s*[:=]\s*"([^"]+)"/i);
      if (quoted?.[1]) cleaned = quoted[1];

      // final safety: do not expose huge raw payloads
      if (cleaned.length > 0 && cleaned.length < 400) return cleaned;
      return "Payment couldn’t be completed. Try another card or method.";
    }
  }
}

type DeliveryType = "pickup" | "delivery";
type PaymentMethod = "full_online" | "cash";

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

const isServerCartItem = (
  item: ServerCartItem | GuestCartItem,
): item is ServerCartItem => "_id" in item;

type CheckoutItemInput = {
  productId: Id<"products">;
  quantity: number;
  personalization?: {
    text?: string;
    color?: string;
    number?: string;
  };
};

type CheckoutFormData = AddressFields & {
  customerName: string;
  customerEmail: string;
  phone: string;
};

type OnlinePaymentFormProps = {
  amountLabel: string;
  totalMinor: number;
  customer: { name: string; email: string; phone?: string };
  isBusy: boolean;
  isAwaitingOrder: boolean;
  errorMessage: string | null;
  setErrorMessage: (value: string | null) => void;
  onSubmit: (args: {
    paymentMethodId: string;
    paymentSource: "card" | "payment_request";
    stripe: import("@stripe/stripe-js").Stripe | null;
  }) => Promise<void>;
};

function OnlinePaymentForm(props: OnlinePaymentFormProps) {
  return (
    <Elements
      stripe={stripePromise}
      options={{ appearance: elementsAppearance }}
    >
      <OnlinePaymentFormFields {...props} />
    </Elements>
  );
}

function OnlinePaymentFormFields({
  amountLabel,
  totalMinor,
  customer,
  isBusy,
  isAwaitingOrder,
  errorMessage,
  setErrorMessage,
  onSubmit,
}: OnlinePaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isPaying, setIsPaying] = useState(false);
  const [paymentRequest, setPaymentRequest] = useState<PaymentRequest | null>(
    null,
  );

  const isDisabled = isBusy || isAwaitingOrder || isPaying;

  const handleCardPayment = useCallback(async () => {
    if (!stripe || !elements) {
      toast.error("Stripe is still loading. Please try again in a moment.");
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      toast.error("Card field is not ready yet. Please try in a second.");
      return;
    }

    setIsPaying(true);
    setErrorMessage(null);

    try {
      const result = await stripe.createPaymentMethod({
        type: "card",
        card: cardElement,
        billing_details: {
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
        },
      });

      if (result.error || !result.paymentMethod?.id) {
        throw new Error(
          result.error?.message ?? "We couldn’t create a payment method.",
        );
      }

      await onSubmit({
        paymentMethodId: result.paymentMethod.id,
        paymentSource: "card",
        stripe,
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? mapStripeErrorToMessage(error.message)
          : mapStripeErrorToMessage(error),
      );
    } finally {
      setIsPaying(false);
    }
  }, [stripe, elements, customer, onSubmit, setErrorMessage]);

  useEffect(() => {
    if (!stripe) {
      setPaymentRequest(null);
      return;
    }

    let isMounted = true;
    const request = stripe.paymentRequest({
      country: STORE_INFO.address.countryCode ?? "AT",
      currency: PAYMENT_CURRENCY,
      total: {
        label: `${STORE_INFO.name} order`,
        amount: totalMinor,
      },
      requestPayerName: true,
      requestPayerEmail: true,
      requestPayerPhone: true,
    });

    const handlePaymentMethod = async (
      event: PaymentRequestPaymentMethodEvent,
    ) => {
      setIsPaying(true);
      setErrorMessage(null);
      try {
        await onSubmit({
          paymentMethodId: event.paymentMethod.id,
          paymentSource: "payment_request",
          stripe,
        });
        event.complete("success");
      } catch (error) {
        event.complete("fail");
        setErrorMessage(
          error instanceof Error
            ? mapStripeErrorToMessage(error.message)
            : mapStripeErrorToMessage(error),
        );
      } finally {
        setIsPaying(false);
      }
    };

    request.canMakePayment().then((result) => {
      if (!isMounted) {
        return;
      }
      if (result) {
        setPaymentRequest(request);
      } else {
        setPaymentRequest(null);
      }
    });

    request.on("paymentmethod", handlePaymentMethod);

    return () => {
      isMounted = false;
      request.off("paymentmethod", handlePaymentMethod);
      setPaymentRequest(null);
    };
  }, [stripe, totalMinor, onSubmit, setErrorMessage]);

  return (
    <div className="space-y-4">
      {paymentRequest && (
        <div
          className={`rounded-2xl border border-gray-200 bg-linear-to-br from-white to-gray-50 p-3 ${isDisabled ? "pointer-events-none opacity-70" : ""}`}
        >
          <p className="text-xs font-semibold tracking-wide text-gray-600 uppercase">
            Express checkout
          </p>
          <div className="mt-2">
            <PaymentRequestButtonElement
              options={{
                paymentRequest,
                style: {
                  paymentRequestButton: {
                    type: "default",
                    theme: "dark",
                    height: "48px",
                  },
                },
              }}
            />
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-white/50 bg-white/90 p-4 shadow-sm">
        <CardElement
          options={{
            hidePostalCode: true,
            style: {
              base: {
                fontSize: "16px",
                color: "#111827",
                "::placeholder": {
                  color: "#9ca3af",
                },
              },
            },
          }}
          onChange={(event) => {
            if (event.error) {
              setErrorMessage(event.error.message ?? null);
            } else if (errorMessage) {
              setErrorMessage(null);
            }
          }}
        />
      </div>
      <div className="bg-primary/5 flex items-start gap-3 rounded-2xl p-3 text-sm text-gray-700">
        <ShieldCheck className="text-secondary h-5 w-5" />
        <p>
          Pay with Apple/Google Pay or the secure card form below. Stripe
          encrypts every method and keeps it PCI compliant.
        </p>
      </div>
      {errorMessage && (
        <p className="text-sm font-medium text-red-500" role="alert">
          {errorMessage}
        </p>
      )}
      {isAwaitingOrder && (
        <p className="text-sm font-medium text-gray-600">
          Payment confirmed — generating your order summary…
        </p>
      )}
      <button
        type="button"
        onClick={handleCardPayment}
        disabled={!stripe || isDisabled}
        className="btn-accent w-full rounded-lg py-3 text-base font-semibold disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isDisabled ? "Processing..." : `Pay ${amountLabel}`}
      </button>
    </div>
  );
}

type OptionCardProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
  badge?: string;
};

function OptionCard({
  icon,
  title,
  description,
  selected,
  onSelect,
  disabled,
  badge,
}: OptionCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={`hover:border-secondary flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition ${
        selected
          ? "border-secondary bg-secondary/5"
          : "border-gray-200 bg-white"
      } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
    >
      <div
        className={`rounded-xl p-2 ${selected ? "bg-secondary/10" : "bg-primary/10"}`}
      >
        {icon}
      </div>
      <div className="flex h-full flex-1 flex-col justify-center gap-1">
        <p className="flex h-full items-center gap-2 text-sm font-semibold text-gray-900">
          {title}
          {badge && (
            <span className="bg-secondary/15 text-secondary rounded-full px-2 py-0.5 text-xs font-medium">
              {badge}
            </span>
          )}
        </p>

        <p className="text-sm text-gray-600">{description}</p>
      </div>
      <span
        className={`mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full border-2 ${
          selected ? "border-secondary" : "border-gray-300"
        }`}
        aria-hidden
      >
        {selected && <span className="bg-secondary h-2.5 w-2.5 rounded-full" />}
      </span>
    </button>
  );
}

type CourierCityCardProps = {
  city: CourierDeliveryCity;
  selected: boolean;
  onSelect: () => void;
};

function CourierCityCard({ city, selected, onSelect }: CourierCityCardProps) {
  const etaRange =
    city.etaDays.min === city.etaDays.max
      ? `${city.etaDays.min} day`
      : `${city.etaDays.min}–${city.etaDays.max} days`;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-2xl border p-4 text-left transition ${
        selected
          ? "border-secondary bg-secondary/5 shadow-sm"
          : "border-gray-200 bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">{city.name}</p>
          <p className="text-xs text-gray-600">Courier delivery</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-gray-900">
            {formatCurrency(city.price)}
          </p>
          <p className="text-xs text-gray-500">{etaRange}</p>
        </div>
      </div>
      {selected && (
        <p className="text-secondary mt-3 text-xs font-medium">
          Selected for delivery
        </p>
      )}
    </button>
  );
}

type SummaryProps = {
  items: (ServerCartItem | GuestCartItem)[] | undefined;
  deliveryCost: number;
  deliveryType: DeliveryType;
  cartOnlyTotal: number;
  total: number;
  selectedCourierCity?: CourierDeliveryCity;
};

function OrderSummary({
  items,
  deliveryCost,
  deliveryType,
  cartOnlyTotal,
  total,
  selectedCourierCity,
}: SummaryProps) {
  const getItemDetails = (item: ServerCartItem | GuestCartItem) => {
    if (isServerCartItem(item)) {
      return {
        key: item._id,
        name: item.product.name,
        price: item.product.price,
        quantity: item.quantity,
        personalization: item.personalization,
      } as const;
    }
    return {
      key: item.productId,
      name: item.product.name,
      price: item.product.price,
      quantity: item.quantity,
      personalization: item.personalization,
    } as const;
  };

  return (
    <aside className="space-y-4">
      <div className="rounded-3xl bg-white/90 p-6 shadow-lg ring-1 ring-black/5">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">
          Order summary
        </h3>
        <div className="space-y-4">
          {items?.map((item, index) => {
            const details = getItemDetails(item);
            return (
              <div
                key={`${details.key}-${index}`}
                className="flex items-start justify-between gap-3"
              >
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {details.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    Quantity: {details.quantity}
                  </p>
                  {details.personalization && (
                    <div className="mt-1 space-y-0.5 text-xs text-gray-600">
                      {details.personalization.color && (
                        <p>Color: {details.personalization.color}</p>
                      )}
                      {details.personalization.text && (
                        <p className="italic">
                          "{details.personalization.text}"
                        </p>
                      )}
                      {details.personalization.number && (
                        <p>Number: {details.personalization.number}</p>
                      )}
                    </div>
                  )}
                </div>
                <p className="text-sm font-semibold text-gray-900">
                  {formatCurrency(details.price * details.quantity)}
                </p>
              </div>
            );
          })}
        </div>
        <div className="mt-5 space-y-2 text-sm text-gray-700">
          <div className="flex items-center justify-between">
            <span>Items subtotal</span>
            <span className="font-semibold">
              {formatCurrency(cartOnlyTotal)}
            </span>
          </div>
          {deliveryType === "delivery" && (
            <div className="flex items-center justify-between">
              <span>
                Delivery
                {selectedCourierCity ? ` (${selectedCourierCity.name})` : ""}
              </span>
              <span className="font-semibold">
                {formatCurrency(deliveryCost)}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between border-t pt-2 text-base font-bold text-gray-900">
            <span>Total</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>
      </div>
      <div className="rounded-3xl border border-white/50 bg-white/80 p-4 text-sm text-gray-700">
        <p className="font-semibold text-gray-900">Good to know:</p>
        <p className="mt-1">
          • We reserve sets after payment or a WhatsApp confirmation
        </p>
        <p>• Production can take up to 72 hours</p>
        <p>• Cancellations are possible 48 hours before pickup/delivery</p>
        <p>• We coordinate orders exclusively through WhatsApp</p>
      </div>
    </aside>
  );
}

export default function CheckoutPage() {
  const router = useRouter();
  const user = useQuery(api.auth.loggedInUser);
  const isAuthenticated = Boolean(user);

  const cartItems = useQuery(api.cart.list);
  const cartTotal = useQuery(api.cart.getTotal);
  const createOrder = useMutation(api.orders.create);
  const createGuestOrder = useMutation(api.orders.createGuest);
  const submitStripePayment = useAction(api.stripe.submitPayment);
  const syncStripePaymentIntent = useAction(api.stripe.syncPaymentIntentStatus);

  const {
    items: guestItems,
    totalPrice: guestTotal,
    initialized: guestInitialized,
    clear: clearGuestCart,
  } = useGuestCart();

  const itemsToDisplay = isAuthenticated ? cartItems : guestItems;
  const cartOnlyTotal = isAuthenticated ? (cartTotal?.total ?? 0) : guestTotal;

  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [formData, setFormData] = useState<CheckoutFormData>(() => ({
    customerName: "",
    customerEmail: "",
    phone: "",
    ...createEmptyAddressFields(),
  }));
  const [deliveryType, setDeliveryType] = useState<DeliveryType>("pickup");
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("full_online");
  const [pickupDateTime, setPickupDateTime] = useState("");
  const [selectedCourierCityId, setSelectedCourierCityId] = useState<
    string | null
  >(null);
  const [whatsappConfirmed, setWhatsappConfirmed] = useState(false);
  const [isCashSubmitting, setIsCashSubmitting] = useState(false);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [pendingPaymentIntentId, setPendingPaymentIntentId] = useState<
    string | null
  >(null);
  const [isAwaitingOrder, setIsAwaitingOrder] = useState(false);
  const paymentLookup = useQuery(
    api.paymentsLookup.lookupByIntent,
    pendingPaymentIntentId
      ? { paymentIntentId: pendingPaymentIntentId }
      : "skip",
  );
  const selectedCourierCity = useMemo(() => {
    if (!selectedCourierCityId) {
      return undefined;
    }
    return COURIER_DELIVERY_CITIES.find(
      (city) => city.id === selectedCourierCityId,
    );
  }, [selectedCourierCityId]);

  useEffect(() => {
    if (!user) {
      return;
    }

    setFormData((prev) => {
      const parsedAddress = parseAddress(user.address);
      return {
        ...prev,
        customerName: prev.customerName || user.name || "",
        customerEmail: user.email ?? prev.customerEmail,
        phone: prev.phone || user.phone || "",
        streetAddress: prev.streetAddress || parsedAddress.streetAddress,
        postalCode: prev.postalCode || parsedAddress.postalCode,
        city: prev.city || parsedAddress.city,
        deliveryNotes: prev.deliveryNotes || parsedAddress.deliveryNotes,
      } satisfies CheckoutFormData;
    });
    // If the parsed city matches one of our courier delivery areas, preselect it
    try {
      const parsed = parseAddress(user.address);
      const matched = COURIER_DELIVERY_CITIES.find(
        (c) =>
          c.name.toLowerCase() === parsed.city.toLowerCase() ||
          c.id.toLowerCase() === parsed.city.toLowerCase(),
      );
      setSelectedCourierCityId(matched ? matched.id : null);
    } catch {
      // ignore parse errors — don't block checkout
    }
  }, [user]);

  const deliveryCost =
    deliveryType === "delivery" && selectedCourierCity
      ? selectedCourierCity.price
      : 0;
  const total = cartOnlyTotal + deliveryCost;

  const shippingAddress = useMemo(
    () =>
      composeAddress({
        streetAddress: formData.streetAddress,
        postalCode: formData.postalCode,
        city: formData.city,
        deliveryNotes: formData.deliveryNotes,
      }),
    [
      formData.streetAddress,
      formData.postalCode,
      formData.city,
      formData.deliveryNotes,
    ],
  );

  const normalizedShippingAddress = useMemo(() => {
    const compiled = shippingAddress.trim();
    if (compiled) {
      return compiled;
    }
    if (deliveryType === "pickup") {
      const storeAddress = `${STORE_INFO.address.street}, ${STORE_INFO.address.city}`;
      return formData.deliveryNotes
        ? `${storeAddress}\n${formData.deliveryNotes.trim()}`
        : storeAddress;
    }
    return "";
  }, [shippingAddress, deliveryType, formData.deliveryNotes]);

  const isEmailReadOnly = Boolean(user?.email);

  const isValidEmail = (email: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const hasDeliveryAddress =
    formData.streetAddress.trim() !== "" &&
    formData.postalCode.trim() !== "" &&
    (deliveryType === "delivery"
      ? Boolean(selectedCourierCity)
      : formData.city.trim() !== "");

  const isFormValid =
    formData.customerName.trim() !== "" &&
    formData.customerEmail.trim() !== "" &&
    isValidEmail(formData.customerEmail) &&
    (deliveryType === "delivery" ? hasDeliveryAddress : true) &&
    (deliveryType === "pickup" ? pickupDateTime.trim() !== "" : true);

  const checkoutItems: CheckoutItemInput[] = useMemo(() => {
    if (!itemsToDisplay) {
      return [];
    }

    return itemsToDisplay.map((item) => {
      if (isServerCartItem(item)) {
        return {
          productId: item.productId,
          quantity: item.quantity,
          personalization: item.personalization,
        } satisfies CheckoutItemInput;
      }

      return {
        productId: item.productId as Id<"products">,
        quantity: item.quantity,
        personalization: item.personalization,
      } satisfies CheckoutItemInput;
    });
  }, [itemsToDisplay]);

  const cartSignature = useMemo(() => {
    return JSON.stringify({
      items: checkoutItems.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        personalization: item.personalization ?? null,
      })),
      deliveryType,
      pickupDateTime,
      address: normalizedShippingAddress,
      email: formData.customerEmail,
      name: formData.customerName,
      total,
      paymentMethod,
    });
  }, [
    checkoutItems,
    deliveryType,
    pickupDateTime,
    normalizedShippingAddress,
    formData.customerEmail,
    formData.customerName,
    total,
    paymentMethod,
  ]);

  const handleDeliveryTypeChange = (type: DeliveryType) => {
    setDeliveryType(type);
    if (type === "delivery") {
      setPickupDateTime("");
      if (!selectedCourierCityId) {
        setFormData((prev) => ({
          ...prev,
          city: "",
        }));
      }
    }
  };

  const handleCourierCitySelect = (cityId: string) => {
    setSelectedCourierCityId(cityId);
    const city = COURIER_DELIVERY_CITIES.find((option) => option.id === cityId);
    if (city) {
      setFormData((prev) => ({
        ...prev,
        city: city.name,
      }));
    }
  };

  const handlePaymentMethodChange = (method: PaymentMethod) => {
    setPaymentMethod(method);
    if (method === "cash") {
      setWhatsappConfirmed(false);
    }
  };

  const handleWhatsAppConfirm = () => {
    const message = WHATSAPP_MESSAGES.orderConfirmation(
      formData.customerName,
      formData.customerEmail,
      normalizedShippingAddress,
      deliveryType,
      pickupDateTime,
    );
    const whatsappLink = getWhatsAppLink(message);
    window.open(whatsappLink, "_blank");
    setWhatsappConfirmed(true);
  };

  useEffect(() => {
    if (!pendingPaymentIntentId) {
      return;
    }

    if (paymentLookup === undefined || paymentLookup === null) {
      return;
    }

    if (paymentLookup.status === "failed" && paymentLookup.lastError) {
      const friendly = mapStripeErrorToMessage(paymentLookup.lastError);
      setPaymentError(friendly);
      setIsAwaitingOrder(false);
      setPendingPaymentIntentId(null);
      toast.error(friendly);
      // Do not redirect — keep user on the payment form and show the friendly message
      return;
    }

    if (paymentLookup.orderId) {
      setIsAwaitingOrder(false);
      setPendingPaymentIntentId(null);
      if (!isAuthenticated) {
        clearGuestCart();
      }
      toast.success("Payment confirmed! Redirecting to your receipt.");
      router.replace(`/checkout/confirmant/${paymentLookup.orderId}`);
    }
  }, [
    paymentLookup,
    pendingPaymentIntentId,
    isAuthenticated,
    clearGuestCart,
    router,
  ]);

  const handleCashCheckout = useCallback(async () => {
    if (!isFormValid) {
      toast.error("Please add contact details and your address first.");
      return;
    }

    if (paymentMethod === "cash" && !whatsappConfirmed) {
      toast.error("Please confirm the order via WhatsApp first.");
      return;
    }

    if (!itemsToDisplay || itemsToDisplay.length === 0) {
      toast.error("Your cart is empty.");
      return;
    }

    setIsCashSubmitting(true);
    try {
      let orderId: Id<"orders"> | null = null;

      if (isAuthenticated) {
        orderId = await createOrder({
          customerName: formData.customerName,
          customerEmail: formData.customerEmail,
          shippingAddress: normalizedShippingAddress,
          deliveryType,
          paymentMethod,
          whatsappConfirmed:
            paymentMethod === "cash" ? whatsappConfirmed : undefined,
          pickupDateTime:
            deliveryType === "pickup" ? pickupDateTime : undefined,
        });
      } else {
        orderId = await createGuestOrder({
          customerName: formData.customerName,
          customerEmail: formData.customerEmail,
          shippingAddress: normalizedShippingAddress,
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
        clearGuestCart();
      }

      toast.success("Order placed! Confirmation is on the way to your email.");
      router.replace(`/checkout/confirmant/${orderId}`);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? mapStripeErrorToMessage(error.message)
          : mapStripeErrorToMessage(error),
      );
    } finally {
      setIsCashSubmitting(false);
    }
  }, [
    isFormValid,
    paymentMethod,
    whatsappConfirmed,
    itemsToDisplay,
    isAuthenticated,
    createOrder,
    createGuestOrder,
    guestItems,
    deliveryType,
    pickupDateTime,
    formData.customerName,
    formData.customerEmail,
    normalizedShippingAddress,
    clearGuestCart,
    router,
  ]);

  const handleOnlinePayment = useCallback(
    async ({
      paymentMethodId,
      paymentSource,
      stripe,
    }: {
      paymentMethodId: string;
      paymentSource: "card" | "payment_request";
      stripe: import("@stripe/stripe-js").Stripe | null;
    }) => {
      if (!isFormValid) {
        throw new Error("Fill in the contact details to continue to payment.");
      }
      if (checkoutItems.length === 0) {
        throw new Error("Your cart is empty.");
      }

      setIsSubmittingPayment(true);
      setPaymentError(null);

      const finalizeSuccessfulPayment = async (paymentIntentId: string) => {
        const syncResult = await syncStripePaymentIntent({
          paymentIntentId,
        });

        if (!syncResult) {
          throw new Error(
            "We couldn’t sync the payment status. Please retry shortly.",
          );
        }

        if (syncResult.status === "failed") {
          // sanitize server error before throwing so UI never shows raw Convex payload
          throw new Error(
            mapStripeErrorToMessage(syncResult.lastError ?? null),
          );
        }

        setPendingPaymentIntentId(paymentIntentId);
        setIsAwaitingOrder(true);
      };

      try {
        const response = await submitStripePayment({
          items: checkoutItems,
          customer: {
            name: formData.customerName,
            email: formData.customerEmail,
            phone: formData.phone.trim() || undefined,
          },
          shipping: {
            address: normalizedShippingAddress,
            deliveryType,
            pickupDateTime:
              deliveryType === "pickup"
                ? pickupDateTime || undefined
                : undefined,
            deliveryFee: deliveryCost || undefined,
          },
          paymentCurrency: PAYMENT_CURRENCY,
          displayAmount: {
            value: Number(total.toFixed(2)),
            currency: DISPLAY_CURRENCY,
          },
          paymentMethodId,
          cartSignature,
          paymentSource,
        });

        if (response.status === "requires_action") {
          if (!response.clientSecret) {
            throw new Error(
              "Stripe requires additional confirmation but no client secret was returned.",
            );
          }
          if (!stripe) {
            throw new Error(
              "Stripe is not ready to finalize the additional confirmation.",
            );
          }

          const { error } = await stripe.confirmCardPayment(
            response.clientSecret,
          );
          if (error) {
            throw new Error(
              error.message ??
                "We still need additional verification for this card.",
            );
          }
          await finalizeSuccessfulPayment(response.paymentIntentId);
          toast.success("Payment confirmed. Finalizing your order…");
          return;
        }

        if (
          response.status === "succeeded" ||
          response.status === "processing"
        ) {
          await finalizeSuccessfulPayment(response.paymentIntentId);
          toast.success("Payment confirmed. Finalizing your order…");
          return;
        }

        // Map server lastError to friendly message
        throw new Error(mapStripeErrorToMessage(response.lastError ?? null));
      } catch (error) {
        const message =
          error instanceof Error
            ? mapStripeErrorToMessage(error.message)
            : mapStripeErrorToMessage(error);
        setPaymentError(message);
        // rethrow so parent flows can catch if they want
        throw new Error(message);
      } finally {
        setIsSubmittingPayment(false);
      }
    },
    [
      isFormValid,
      checkoutItems,
      submitStripePayment,
      formData.customerName,
      formData.customerEmail,
      formData.phone,
      normalizedShippingAddress,
      deliveryType,
      pickupDateTime,
      deliveryCost,
      total,
      cartSignature,
      syncStripePaymentIntent,
    ],
  );

  const proceedToPaymentStep = () => {
    if (!isFormValid) {
      toast.error("Please complete all required fields.");
      return;
    }
    setCurrentStep(2);
  };

  const returnToDetailsStep = () => {
    setCurrentStep(1);
  };

  if (isAuthenticated && (cartItems === undefined || cartTotal === undefined)) {
    return <CheckoutSkeleton />;
  }

  if (!isAuthenticated && !guestInitialized) {
    return <CheckoutSkeleton />;
  }

  if (!itemsToDisplay || itemsToDisplay.length === 0) {
    return (
      <div className="bg-primary min-h-screen">
        <div className="container mx-auto px-4 py-8">
          <div className="mx-auto max-w-3xl rounded-3xl bg-white/90 p-8 text-center shadow-lg">
            <h2 className="text-2xl font-bold text-gray-900">
              Your cart is empty
            </h2>
            <p className="mt-2 text-gray-600">
              Add a set to your cart before heading to checkout.
            </p>
            <button
              type="button"
              onClick={() => router.push("/catalog")}
              className="btn-accent mt-6 rounded-full px-6 py-3 text-base font-semibold"
            >
              Browse catalog
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-primary min-h-screen">
      <main className="container mx-auto px-4 py-6 sm:py-10">
        <div className="mx-auto max-w-6xl space-y-6">
          <header className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-white/20 bg-white/70 p-4 shadow-sm backdrop-blur">
            <button
              type="button"
              onClick={() => router.push("/cart")}
              className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 transition hover:text-gray-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to cart
            </button>
            <StepIndicator currentStep={currentStep} />
          </header>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <section className="space-y-6">
              {currentStep === 1 ? (
                <StepOne
                  formData={formData}
                  setFormData={setFormData}
                  isValidEmail={isValidEmail}
                  deliveryType={deliveryType}
                  selectedCourierCity={selectedCourierCity}
                  selectedCourierCityId={selectedCourierCityId}
                  courierCities={COURIER_DELIVERY_CITIES}
                  onCourierCitySelect={handleCourierCitySelect}
                  pickupDateTime={pickupDateTime}
                  setPickupDateTime={setPickupDateTime}
                  handleDeliveryTypeChange={handleDeliveryTypeChange}
                  proceedToPaymentStep={proceedToPaymentStep}
                  isFormValid={isFormValid}
                  isEmailReadOnly={isEmailReadOnly}
                />
              ) : (
                <StepTwo
                  paymentMethod={paymentMethod}
                  deliveryType={deliveryType}
                  whatsappConfirmed={whatsappConfirmed}
                  isFormValid={isFormValid}
                  isCashSubmitting={isCashSubmitting}
                  setPaymentMethod={handlePaymentMethodChange}
                  handleWhatsAppConfirm={handleWhatsAppConfirm}
                  handleCashCheckout={handleCashCheckout}
                  returnToDetailsStep={returnToDetailsStep}
                  customer={{
                    name: formData.customerName,
                    email: formData.customerEmail,
                    phone: formData.phone,
                  }}
                  total={total}
                  isSubmittingPayment={isSubmittingPayment}
                  isAwaitingOrder={isAwaitingOrder}
                  paymentError={paymentError}
                  setPaymentError={setPaymentError}
                  handleOnlinePayment={handleOnlinePayment}
                />
              )}
            </section>

            <OrderSummary
              items={itemsToDisplay}
              deliveryCost={deliveryCost}
              deliveryType={deliveryType}
              cartOnlyTotal={cartOnlyTotal}
              total={total}
              selectedCourierCity={selectedCourierCity}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

type StepOneProps = {
  formData: CheckoutFormData;
  setFormData: React.Dispatch<React.SetStateAction<CheckoutFormData>>;
  isValidEmail: (email: string) => boolean;
  deliveryType: DeliveryType;
  selectedCourierCity?: CourierDeliveryCity;
  selectedCourierCityId: string | null;
  courierCities: CourierDeliveryCity[];
  onCourierCitySelect: (cityId: string) => void;
  pickupDateTime: string;
  setPickupDateTime: (value: string) => void;
  handleDeliveryTypeChange: (type: DeliveryType) => void;
  proceedToPaymentStep: () => void;
  isFormValid: boolean;
  isEmailReadOnly: boolean;
};

function StepOne({
  formData,
  setFormData,
  isValidEmail,
  deliveryType,
  selectedCourierCity,
  selectedCourierCityId,
  courierCities,
  onCourierCitySelect,
  pickupDateTime,
  setPickupDateTime,
  handleDeliveryTypeChange,
  proceedToPaymentStep,
  isFormValid,
  isEmailReadOnly,
}: StepOneProps) {
  const emailHasError =
    formData.customerEmail.trim() !== "" &&
    !isValidEmail(formData.customerEmail);
  const _courierDescription = selectedCourierCity
    ? `+${formatCurrency(selectedCourierCity.price)} · ${
        selectedCourierCity.etaDays.min
      }-${selectedCourierCity.etaDays.max} days`
    : "Select a courier city to see price & ETA";

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Contact details</h2>
        <p className="mt-1 text-sm text-gray-500">
          We send receipts and order updates to this information.
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2">
            <span className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <User className="h-4 w-4" /> Full name
            </span>
            <input
              type="text"
              value={formData.customerName}
              onChange={(event) =>
                setFormData((prev) => ({
                  ...prev,
                  customerName: event.target.value,
                }))
              }
              className="focus:border-secondary rounded-xl border border-gray-200 px-4 py-3 text-sm transition outline-none"
              placeholder="e.g., Anna Mayer"
              autoComplete="name"
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Mail className="h-4 w-4" /> Email for receipts
            </span>
            <input
              type="email"
              value={formData.customerEmail}
              readOnly={isEmailReadOnly}
              onChange={(event) =>
                setFormData((prev) => ({
                  ...prev,
                  customerEmail: event.target.value,
                }))
              }
              className={`rounded-xl border px-4 py-3 text-sm transition outline-none ${
                emailHasError
                  ? "border-red-500"
                  : "focus:border-secondary border-gray-200"
              } ${isEmailReadOnly ? "bg-gray-50 text-gray-500" : ""}`}
              placeholder="you@example.com"
              autoComplete="email"
            />
            {isEmailReadOnly && (
              <span className="text-xs text-gray-500">
                Email comes from your profile. Update it from the Profile page.
              </span>
            )}
          </label>
          <label className="flex flex-col gap-2 md:col-span-2">
            <span className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Phone className="h-4 w-4" /> Phone number (optional)
            </span>
            <input
              type="tel"
              value={formData.phone}
              onChange={(event) =>
                setFormData((prev) => ({
                  ...prev,
                  phone: event.target.value,
                }))
              }
              className="focus:border-secondary rounded-xl border border-gray-200 px-4 py-3 text-sm transition outline-none"
              placeholder="Include country code"
              autoComplete="tel"
            />
          </label>
        </div>
      </div>

      <div className="rounded-3xl bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">
          How would you like to receive your balloons?
        </h2>
        <div className="mt-4 space-y-3">
          <OptionCard
            icon={<Store className="text-secondary h-5 w-5" />}
            title="Self pickup"
            description={`${STORE_INFO.address.street}, ${STORE_INFO.address.city}`}
            selected={deliveryType === "pickup"}
            onSelect={() => handleDeliveryTypeChange("pickup")}
            badge="Popular"
          />
          <OptionCard
            icon={<Truck className="text-secondary h-5 w-5" />}
            title={`Courier delivery (${STORE_INFO.delivery.hours})`}
            description="Choose your city"
            selected={deliveryType === "delivery"}
            onSelect={() => handleDeliveryTypeChange("delivery")}
          />
        </div>
        {deliveryType === "pickup" && (
          <label className="mt-4 flex flex-col gap-2">
            <span className="text-sm font-medium text-gray-700">
              Preferred pickup date & time (
              {STORE_INFO.orderPolicy.minPickupDays} days ahead minimum)
            </span>
            <input
              type="datetime-local"
              value={pickupDateTime}
              onChange={(event) => setPickupDateTime(event.target.value)}
              min={getMinPickupDateTime()}
              className="focus:border-secondary rounded-xl border border-gray-200 px-4 py-3 text-sm transition outline-none"
            />
          </label>
        )}
      </div>

      {deliveryType === "delivery" && (
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">
            Delivery details
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Address fields are prefilled from your profile so checkout stays
            fast.
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {deliveryType === "delivery" && (
              <div className="space-y-3 md:col-span-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    Courier service areas
                  </span>
                  <span className="text-xs text-gray-500">
                    Tap a city to select
                  </span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {courierCities.map((city) => (
                    <CourierCityCard
                      key={city.id}
                      city={city}
                      selected={selectedCourierCityId === city.id}
                      onSelect={() => onCourierCitySelect(city.id)}
                    />
                  ))}
                </div>
                <p className="text-xs text-gray-500">
                  Need another city? Message us on WhatsApp and we’ll help
                  arrange a custom route.
                </p>
              </div>
            )}
            <label className="flex flex-col gap-2 md:col-span-2">
              <span className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <MapPin className="h-4 w-4" /> Street and house number
              </span>
              <input
                type="text"
                value={formData.streetAddress}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    streetAddress: event.target.value,
                  }))
                }
                className="focus:border-secondary rounded-xl border border-gray-200 px-4 py-3 text-sm transition outline-none"
                placeholder="Mariahilfer Str. 10"
                autoComplete="address-line1"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-gray-700">
                Postal code
              </span>
              <input
                type="text"
                value={formData.postalCode}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    postalCode: event.target.value,
                  }))
                }
                className="focus:border-secondary rounded-xl border border-gray-200 px-4 py-3 text-sm transition outline-none"
                placeholder="1070"
                autoComplete="postal-code"
              />
            </label>
            <label className="flex flex-col gap-2 md:col-span-2">
              <span className="text-sm font-medium text-gray-700">
                Notes for courier or pickup
              </span>
              <textarea
                rows={3}
                value={formData.deliveryNotes}
                onChange={(event) =>
                  setFormData((prev) => ({
                    ...prev,
                    deliveryNotes: event.target.value,
                  }))
                }
                className="focus:border-secondary rounded-2xl border border-gray-200 px-4 py-3 text-sm transition outline-none"
                placeholder="Door code, floor, or pickup preferences"
                autoComplete="address-line2"
              />
            </label>
          </div>
        </div>
      )}

      <div className="border-secondary/40 bg-secondary/5 flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-dashed px-6 py-4">
        <div>
          <p className="text-sm font-semibold text-gray-900">Step 1 of 2</p>
          <p className="text-xs text-gray-600">
            Continue to payments once the form is complete.
          </p>
        </div>
        <button
          type="button"
          onClick={proceedToPaymentStep}
          disabled={!isFormValid}
          className="btn-accent rounded-full px-6 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
        >
          Go to payment
        </button>
      </div>
    </div>
  );
}

type StepTwoProps = {
  paymentMethod: PaymentMethod;
  deliveryType: DeliveryType;
  whatsappConfirmed: boolean;
  isFormValid: boolean;
  isCashSubmitting: boolean;
  setPaymentMethod: (method: PaymentMethod) => void;
  handleWhatsAppConfirm: () => void;
  handleCashCheckout: () => Promise<void> | void;
  returnToDetailsStep: () => void;
  customer: { name: string; email: string; phone: string };
  total: number;
  isSubmittingPayment: boolean;
  isAwaitingOrder: boolean;
  paymentError: string | null;
  setPaymentError: (value: string | null) => void;
  handleOnlinePayment: OnlinePaymentFormProps["onSubmit"];
};

function StepTwo({
  paymentMethod,
  deliveryType,
  whatsappConfirmed,
  isFormValid,
  isCashSubmitting,
  setPaymentMethod,
  handleWhatsAppConfirm,
  handleCashCheckout,
  returnToDetailsStep,
  customer,
  total,
  isSubmittingPayment,
  isAwaitingOrder,
  paymentError,
  setPaymentError,
  handleOnlinePayment,
}: StepTwoProps) {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Payment method</h2>
        <div className="mt-4 space-y-3">
          <OptionCard
            icon={<CreditCard className="text-secondary h-5 w-5" />}
            title="Instant online payment"
            description="Stripe Elements + Apple Pay or Google Pay"
            selected={paymentMethod === "full_online"}
            onSelect={() => setPaymentMethod("full_online")}
          />
          <OptionCard
            icon={<DollarSign className="text-secondary h-5 w-5" />}
            title="Pay during pickup"
            description="Confirm in WhatsApp and pay when you arrive"
            selected={paymentMethod === "cash"}
            onSelect={() => setPaymentMethod("cash")}
            disabled={deliveryType !== "pickup"}
            badge={deliveryType === "pickup" ? undefined : "Pickup only"}
          />
        </div>
      </div>

      {paymentMethod === "full_online" && (
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <h3 className="text-base font-semibold text-gray-900">
            Secure online checkout
          </h3>
          <div className="mt-4">
            <OnlinePaymentForm
              amountLabel={formatCurrency(total)}
              totalMinor={Math.round(total * 100)}
              customer={{
                name: customer.name,
                email: customer.email,
                phone: customer.phone,
              }}
              isBusy={isSubmittingPayment}
              isAwaitingOrder={isAwaitingOrder}
              errorMessage={paymentError}
              setErrorMessage={setPaymentError}
              onSubmit={handleOnlinePayment}
            />
          </div>
        </div>
      )}

      {paymentMethod === "cash" && (
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <h3 className="text-base font-semibold text-gray-900">
            Confirm via WhatsApp
          </h3>
          <div className="mt-4 space-y-4">
            <div className="border-secondary/40 bg-secondary/5 rounded-2xl border border-dashed p-4 text-sm text-gray-700">
              <p>Send us a short WhatsApp message so we can reserve the set.</p>
              <p className="mt-1">
                Please text us before visiting the studio and we will prepare
                the balloons for pickup.
              </p>
            </div>
            <button
              type="button"
              onClick={handleWhatsAppConfirm}
              disabled={!isFormValid}
              className="flex w-full items-center justify-center gap-3 rounded-2xl bg-[#111B21] px-4 py-3 text-[#FCF5EB] shadow-md transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#25D366]">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  className="h-5 w-5 fill-[#FCF5EB]"
                  role="img"
                  aria-labelledby="whatsapp-icon-title"
                >
                  <title id="whatsapp-icon-title">WhatsApp icon</title>
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                </svg>
              </span>
              <span className="text-left text-base font-semibold">
                Message us on WhatsApp
              </span>
            </button>
            {whatsappConfirmed && (
              <p className="text-secondary text-sm font-medium">
                Message sent. We will confirm and prep the balloons once we
                reply.
              </p>
            )}
            <button
              type="button"
              onClick={handleCashCheckout}
              disabled={!whatsappConfirmed || isCashSubmitting}
              className="btn-accent w-full rounded-2xl py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isCashSubmitting ? "Saving order..." : "Reserve pickup slot"}
            </button>
          </div>
        </div>
      )}

      <div className="border-secondary/40 bg-secondary/5 flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-dashed px-6 py-4">
        <button
          type="button"
          onClick={returnToDetailsStep}
          className="text-sm font-semibold text-gray-600 hover:text-gray-900"
        >
          ← Back to step 1
        </button>
        <p className="text-sm font-semibold text-gray-900">Step 2 of 2</p>
      </div>
    </div>
  );
}

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center gap-3 text-sm font-semibold text-gray-700">
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-center gap-3">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${
              currentStep === step.id
                ? "border-secondary text-secondary"
                : "border-gray-300 text-gray-400"
            }`}
          >
            {step.id}
          </div>
          <span
            className={
              currentStep === step.id ? "text-gray-900" : "text-gray-400"
            }
          >
            {step.title}
          </span>
          {index < steps.length - 1 && (
            <div className="h-px w-12 bg-gray-200" />
          )}
        </div>
      ))}
    </div>
  );
}

function CheckoutSkeleton() {
  return (
    <div className="bg-primary min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-5xl animate-pulse space-y-4">
          <div className="h-12 rounded-3xl bg-white/70" />
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, idx) => (
                <div
                  key={`skeleton-card-${idx}`}
                  className="h-40 rounded-3xl bg-white"
                />
              ))}
            </div>
            <div className="h-64 rounded-3xl bg-white" />
          </div>
        </div>
      </div>
    </div>
  );
}
