"use client";

import {
  Elements,
  PaymentElement,
  PaymentRequestButtonElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import {
  type Appearance,
  loadStripe,
  type StripeElementsOptions,
  type StripePaymentElementChangeEvent,
  type PaymentRequestPaymentMethodEvent,
  type PaymentRequest,
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
import {
  getWhatsAppLink,
  STORE_INFO,
  WHATSAPP_MESSAGES,
} from "@/constants/config";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { ProductWithImage } from "@/convex/helpers/products";
import { type GuestCartItem, useGuestCart } from "@/lib/guestCart";
import {
  composeAddress,
  createEmptyAddressFields,
  parseAddress,
  type AddressFields,
} from "@/lib/address";

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

type StripePaymentElementChangeEventWithError =
  StripePaymentElementChangeEvent & {
    error?: {
      message?: string | null;
    };
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

type PaymentStatus =
  | "requires_payment_method"
  | "requires_confirmation"
  | "requires_action"
  | "processing"
  | "requires_capture"
  | "succeeded"
  | "canceled"
  | "failed"
  | "refunded";

type PaymentSession = {
  paymentIntentId: string;
  clientSecret: string;
  orderId: Id<"orders">;
  paymentId: Id<"payments">;
  amountMinor: number;
  currency: string;
  status: PaymentStatus;
  cartSignature: string;
};

const isServerCartItem = (
  item: ServerCartItem | GuestCartItem,
): item is ServerCartItem => "_id" in item;

const createElementsOptions = (
  clientSecret: string,
): StripeElementsOptions => ({
  clientSecret,
  appearance: elementsAppearance,
});

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

type StripePaymentElementProps = {
  session: PaymentSession;
  amountLabel: string;
  customer: { name: string; email: string; phone?: string };
  syncPaymentIntent: (args: { paymentIntentId: string }) => Promise<{
    paymentIntentId: string;
    status:
      | "requires_payment_method"
      | "requires_confirmation"
      | "requires_action"
      | "processing"
      | "requires_capture"
      | "succeeded"
      | "canceled"
      | "failed"
      | "refunded";
    orderId: Id<"orders">;
    paymentId: Id<"payments">;
    clientSecret: string;
    lastError?: string;
  } | null>;
  shouldClearGuestCart: boolean;
  clearGuestCart: () => void;
  onCompleted: (orderId: Id<"orders">) => void;
};

function StripePaymentSection({
  session,
  amountLabel,
  customer,
  syncPaymentIntent,
  shouldClearGuestCart,
  clearGuestCart,
  onCompleted,
}: StripePaymentElementProps) {
  return (
    <Elements
      key={session.paymentIntentId}
      stripe={stripePromise}
      options={createElementsOptions(session.clientSecret)}
    >
      <StripePaymentElement
        session={session}
        amountLabel={amountLabel}
        customer={customer}
        syncPaymentIntent={syncPaymentIntent}
        shouldClearGuestCart={shouldClearGuestCart}
        clearGuestCart={clearGuestCart}
        onCompleted={onCompleted}
      />
    </Elements>
  );
}

function StripePaymentElement({
  session,
  amountLabel,
  customer,
  syncPaymentIntent,
  shouldClearGuestCart,
  clearGuestCart,
  onCompleted,
}: StripePaymentElementProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isPaying, setIsPaying] = useState(false);
  const [elementReady, setElementReady] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [paymentRequest, setPaymentRequest] = useState<PaymentRequest | null>(
    null,
  );

  const finalizePayment = useCallback(async () => {
    try {
      const syncResult = await syncPaymentIntent({
        paymentIntentId: session.paymentIntentId,
      });

      if (!syncResult) {
        setErrorMessage(
          "We couldn’t refresh the payment status. Please try again.",
        );
        return;
      }

      if (syncResult.status === "succeeded") {
        toast.success("Payment completed successfully.");
        if (shouldClearGuestCart) {
          clearGuestCart();
        }
        onCompleted(syncResult.orderId);
        return;
      }

      if (syncResult.status === "processing") {
        toast.info("Your bank is still processing the payment.");
        setErrorMessage("Your bank is still processing the payment.");
        return;
      }

      if (syncResult.status === "requires_action") {
        toast.message("Additional confirmation required", {
          description: "Follow the Stripe instructions to finish paying.",
        });
        setErrorMessage(
          "Stripe needs extra confirmation. Complete the verification to continue.",
        );
        return;
      }

      if (syncResult.status === "failed") {
        setErrorMessage(
          syncResult.lastError ?? "The bank declined this payment attempt.",
        );
        return;
      }

      setErrorMessage(
        syncResult.lastError ??
          "The payment isn’t complete yet. Please try again shortly.",
      );
    } catch (syncError) {
      setErrorMessage(
        syncError instanceof Error
          ? syncError.message
          : "We couldn’t sync the payment status.",
      );
    }
  }, [
    syncPaymentIntent,
    session.paymentIntentId,
    shouldClearGuestCart,
    clearGuestCart,
    onCompleted,
  ]);

  const handleConfirm = useCallback(async () => {
    if (!stripe || !elements) {
      toast.error("Stripe is still loading. Please try again in a moment.");
      return;
    }

    setIsPaying(true);
    setErrorMessage(null);

    const result = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
      confirmParams: {
        payment_method_data: {
          billing_details: {
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
          },
        },
      },
    });

    if (result.error) {
      setErrorMessage(
        result.error.message ?? "We couldn’t process the payment right now.",
      );
      setIsPaying(false);
      return;
    }

    await finalizePayment();
    setIsPaying(false);
  }, [stripe, elements, customer, finalizePayment]);

  useEffect(() => {
    if (!stripe) {
      setPaymentRequest(null);
      return;
    }

    let isMounted = true;
    const request = stripe.paymentRequest({
      country: STORE_INFO.address.countryCode ?? "AT",
      currency: session.currency,
      total: {
        label: `${STORE_INFO.name} order`,
        amount: session.amountMinor,
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
        const { error: confirmError, paymentIntent } =
          await stripe.confirmCardPayment(
            session.clientSecret,
            {
              payment_method: event.paymentMethod.id,
            },
            { handleActions: false },
          );

        if (confirmError) {
          event.complete("fail");
          setErrorMessage(
            confirmError.message ??
              "Express payment failed. Please try another method.",
          );
          setIsPaying(false);
          return;
        }

        event.complete("success");

        if (paymentIntent?.status === "requires_action") {
          const { error: actionError } = await stripe.confirmCardPayment(
            session.clientSecret,
          );
          if (actionError) {
            setErrorMessage(
              actionError.message ??
                "We still need additional verification for this card.",
            );
            setIsPaying(false);
            return;
          }
        }

        await finalizePayment();
      } catch (error) {
        event.complete("fail");
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Express payment failed. Please use the card form.",
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
  }, [
    stripe,
    session.currency,
    session.amountMinor,
    session.clientSecret,
    finalizePayment,
  ]);

  return (
    <div className="space-y-4">
      {paymentRequest && (
        <div
          className={`rounded-2xl border border-gray-200 bg-linear-to-br from-white to-gray-50 p-3 ${isPaying ? "pointer-events-none opacity-70" : ""}`}
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
        <PaymentElement
          options={{
            defaultValues: {},
            business: {
              name: "Ballon Boutique",
            },
            wallets: { applePay: "auto", googlePay: "auto", link: "never" },
          }}
          onReady={() => setElementReady(true)}
          onChange={(event: StripePaymentElementChangeEventWithError) => {
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
          Pay with the express buttons above or use the card form. Stripe keeps
          every method encrypted and PCI compliant.
        </p>
      </div>
      {errorMessage && (
        <p className="text-sm font-medium text-red-500" role="alert">
          {errorMessage}
        </p>
      )}
      <button
        type="button"
        onClick={handleConfirm}
        disabled={!stripe || !elementReady || isPaying}
        className="btn-accent w-full rounded-lg py-3 text-base font-semibold disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPaying ? "Processing payment..." : `Pay ${amountLabel}`}
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
      <div className="flex-1">
        <p className="flex items-center gap-2 text-sm font-semibold text-gray-900">
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

type SummaryProps = {
  items: (ServerCartItem | GuestCartItem)[] | undefined;
  deliveryCost: number;
  deliveryType: DeliveryType;
  cartOnlyTotal: number;
  total: number;
};

function OrderSummary({
  items,
  deliveryCost,
  deliveryType,
  cartOnlyTotal,
  total,
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
              <span>Delivery</span>
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
  const createStripePaymentIntent = useAction(api.stripe.createPaymentIntent);
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
  const [whatsappConfirmed, setWhatsappConfirmed] = useState(false);
  const [isCashSubmitting, setIsCashSubmitting] = useState(false);
  const [isCreatingIntent, setIsCreatingIntent] = useState(false);
  const [paymentSession, setPaymentSession] = useState<PaymentSession | null>(
    null,
  );
  const [lastPreparedSignature, setLastPreparedSignature] = useState<
    string | null
  >(null);
  const [paymentSessionError, setPaymentSessionError] = useState<string | null>(
    null,
  );

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
  }, [user]);

  const deliveryCost =
    deliveryType === "delivery" ? STORE_INFO.delivery.cost : 0;
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
    formData.city.trim() !== "";

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

  useEffect(() => {
    if (paymentSession && paymentSession.cartSignature !== cartSignature) {
      setPaymentSession(null);
    }
  }, [paymentSession, cartSignature]);

  useEffect(() => {
    if (!cartSignature) {
      return;
    }
    setLastPreparedSignature(null);
    setPaymentSessionError(null);
  }, [cartSignature]);

  useEffect(() => {
    if (paymentMethod === "cash" && paymentSession) {
      setPaymentSession(null);
      setLastPreparedSignature(null);
      setPaymentSessionError(null);
    }
  }, [paymentMethod, paymentSession]);

  const handleDeliveryTypeChange = (type: DeliveryType) => {
    setDeliveryType(type);
    if (type === "delivery") {
      setPickupDateTime("");
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
      router.push(`/order-confirmation/${orderId}`);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "We couldn’t place the order. Please try again.",
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

  const handleCreatePaymentSession = useCallback(async () => {
    if (!isFormValid) {
      toast.error("Fill in the contact details to continue to payment.");
      return;
    }
    if (checkoutItems.length === 0) {
      toast.error("Your cart is empty.");
      return;
    }

    setIsCreatingIntent(true);
    setPaymentSessionError(null);
    try {
      const session = await createStripePaymentIntent({
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
            deliveryType === "pickup" ? pickupDateTime || undefined : undefined,
          deliveryFee: deliveryCost || undefined,
        },
        paymentCurrency: PAYMENT_CURRENCY,
        displayAmount: {
          value: Number(total.toFixed(2)),
          currency: DISPLAY_CURRENCY,
        },
        metadata: {
          cartSignature,
        },
      });

      setPaymentSession({ ...session, cartSignature });
      setPaymentSessionError(null);
      toast.success("Payment form ready — you can pay now!");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "We couldn’t prepare the payment. Please try again.";
      setPaymentSessionError(message);
      toast.error(message);
    } finally {
      setIsCreatingIntent(false);
      setLastPreparedSignature(cartSignature);
    }
  }, [
    isFormValid,
    checkoutItems,
    createStripePaymentIntent,
    formData.customerName,
    formData.customerEmail,
    formData.phone,
    normalizedShippingAddress,
    deliveryType,
    pickupDateTime,
    deliveryCost,
    total,
    cartSignature,
  ]);

  const handlePaymentCompleted = (orderId: Id<"orders">) => {
    router.push(`/order-confirmation/${orderId}`);
  };

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
                  deliveryCost={deliveryCost}
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
                  isCreatingIntent={isCreatingIntent}
                  isCashSubmitting={isCashSubmitting}
                  paymentSession={paymentSession}
                  cartSignature={cartSignature}
                  lastPreparedSignature={lastPreparedSignature}
                  setPaymentMethod={handlePaymentMethodChange}
                  handleWhatsAppConfirm={handleWhatsAppConfirm}
                  handleCashCheckout={handleCashCheckout}
                  handleCreatePaymentSession={handleCreatePaymentSession}
                  returnToDetailsStep={returnToDetailsStep}
                  customer={{
                    name: formData.customerName,
                    email: formData.customerEmail,
                    phone: formData.phone,
                  }}
                  total={total}
                  syncStripePaymentIntent={syncStripePaymentIntent}
                  clearGuestCart={clearGuestCart}
                  shouldClearGuestCart={!isAuthenticated}
                  onCompleted={handlePaymentCompleted}
                  paymentSessionError={paymentSessionError}
                />
              )}
            </section>

            <OrderSummary
              items={itemsToDisplay}
              deliveryCost={deliveryCost}
              deliveryType={deliveryType}
              cartOnlyTotal={cartOnlyTotal}
              total={total}
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
  deliveryCost: number;
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
  deliveryCost,
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
          Delivery details
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Address fields are prefilled from your profile so checkout stays fast.
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
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
            <span className="text-sm font-medium text-gray-700">City</span>
            <input
              type="text"
              value={formData.city}
              onChange={(event) =>
                setFormData((prev) => ({
                  ...prev,
                  city: event.target.value,
                }))
              }
              className="focus:border-secondary rounded-xl border border-gray-200 px-4 py-3 text-sm transition outline-none"
              placeholder={STORE_INFO.address.city}
              autoComplete="address-level2"
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
            description={`+${formatCurrency(deliveryCost)} within ${STORE_INFO.address.city}`}
            selected={deliveryType === "delivery"}
            onSelect={() => handleDeliveryTypeChange("delivery")}
          />
        </div>
        {deliveryType === "pickup" && (
          <label className="mt-4 flex flex-col gap-2">
            <span className="text-sm font-medium text-gray-700">
              Preferred pickup date & time
            </span>
            <input
              type="datetime-local"
              value={pickupDateTime}
              onChange={(event) => setPickupDateTime(event.target.value)}
              className="focus:border-secondary rounded-xl border border-gray-200 px-4 py-3 text-sm transition outline-none"
            />
          </label>
        )}
      </div>

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
  isCreatingIntent: boolean;
  isCashSubmitting: boolean;
  paymentSession: PaymentSession | null;
  cartSignature: string;
  lastPreparedSignature: string | null;
  setPaymentMethod: (method: PaymentMethod) => void;
  handleWhatsAppConfirm: () => void;
  handleCashCheckout: () => Promise<void> | void;
  handleCreatePaymentSession: () => Promise<void> | void;
  returnToDetailsStep: () => void;
  customer: { name: string; email: string; phone: string };
  total: number;
  syncStripePaymentIntent: StripePaymentElementProps["syncPaymentIntent"];
  clearGuestCart: () => void;
  shouldClearGuestCart: boolean;
  onCompleted: (orderId: Id<"orders">) => void;
  paymentSessionError: string | null;
};

function StepTwo({
  paymentMethod,
  deliveryType,
  whatsappConfirmed,
  isFormValid,
  isCreatingIntent,
  isCashSubmitting,
  paymentSession,
  cartSignature,
  lastPreparedSignature,
  setPaymentMethod,
  handleWhatsAppConfirm,
  handleCashCheckout,
  handleCreatePaymentSession,
  returnToDetailsStep,
  customer,
  total,
  syncStripePaymentIntent,
  clearGuestCart,
  shouldClearGuestCart,
  onCompleted,
  paymentSessionError,
}: StepTwoProps) {
  useEffect(() => {
    if (
      paymentMethod === "full_online" &&
      isFormValid &&
      !paymentSession &&
      !isCreatingIntent &&
      cartSignature !== lastPreparedSignature &&
      !paymentSessionError
    ) {
      void handleCreatePaymentSession();
    }
  }, [
    paymentMethod,
    isFormValid,
    paymentSession,
    isCreatingIntent,
    cartSignature,
    lastPreparedSignature,
    paymentSessionError,
    handleCreatePaymentSession,
  ]);

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
          {paymentSession ? (
            <div className="mt-4">
              <StripePaymentSection
                session={paymentSession}
                amountLabel={formatCurrency(total)}
                customer={{
                  name: customer.name,
                  email: customer.email,
                  phone: customer.phone.trim() || undefined,
                }}
                syncPaymentIntent={syncStripePaymentIntent}
                shouldClearGuestCart={shouldClearGuestCart}
                clearGuestCart={clearGuestCart}
                onCompleted={onCompleted}
              />
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-dashed border-gray-200 bg-gray-50/80 p-4">
              <p className="text-sm font-semibold text-gray-800">
                Building the Stripe form…
              </p>
              {paymentSessionError ? (
                <>
                  <p className="mt-1 text-xs text-rose-600">
                    {paymentSessionError}
                  </p>
                  <button
                    type="button"
                    onClick={handleCreatePaymentSession}
                    disabled={isCreatingIntent}
                    className="btn-accent mt-4 rounded-full px-4 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isCreatingIntent ? "Retrying…" : "Retry now"}
                  </button>
                </>
              ) : (
                <>
                  <p className="mt-1 text-xs text-gray-600">
                    As soon as contact details are valid we initialize card
                    fields and Apple/Google Pay automatically.
                  </p>
                  <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white">
                    <span
                      className={`bg-secondary block h-full rounded-full ${isCreatingIntent ? "animate-pulse" : ""}`}
                      style={{ width: isCreatingIntent ? "80%" : "35%" }}
                    />
                  </div>
                </>
              )}
            </div>
          )}
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
                ✅ Message sent. We will confirm and prep the balloons once we
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
