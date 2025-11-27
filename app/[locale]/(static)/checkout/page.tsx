"use client";

import { zodResolver } from "@hookform/resolvers/zod";
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
import type { Route } from "next";
import { useTranslations } from "next-intl";
import type { ChangeEvent, FocusEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { type Resolver, type UseFormReturn, useForm } from "react-hook-form";
import { toast } from "sonner";
import type Stripe from "stripe";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import Input from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { useRouter } from "@/i18n/routing";
import {
  type AddressFields,
  composeAddress,
  createAddressSchema,
  createEmptyAddressFields,
  parseAddress,
} from "@/lib/address";
import { type GuestCartItem, useGuestCart } from "@/lib/guestCart";

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

// Steps will be translated in component
const steps = [
  { id: 1, titleKey: "steps.details" },
  { id: 2, titleKey: "steps.payment" },
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
 * Calculate minimum delivery datetime with time constraints
 */
const getMinDeliveryDateTime = (): string => {
  const date = new Date();
  date.setDate(date.getDate() + STORE_INFO.orderPolicy.minPickupDays);
  date.setHours(STORE_INFO.delivery.minDeliveryHour, 0, 0, 0);
  // Format to datetime-local format: YYYY-MM-DDTHH:mm
  return date.toISOString().slice(0, 16);
};

/**
 * Calculate maximum delivery datetime with time constraints
 */
/**
 * Calculate maximum delivery datetime with time constraints
 * Note: max attribute in datetime-local only works for the specific date,
 * so we need to validate time in the validation function as well
 */
const getMaxDeliveryDateTime = (): string => {
  const date = new Date();
  date.setDate(date.getDate() + STORE_INFO.orderPolicy.minPickupDays);
  date.setHours(STORE_INFO.delivery.maxDeliveryHour, 0, 0, 0);
  // Format to datetime-local format: YYYY-MM-DDTHH:mm
  return date.toISOString().slice(0, 16);
};

/**
 * Helper: turn Stripe/Convex/server errors into user-friendly English messages
 */
type StripeError =
  | Stripe.StripeRawError
  | string
  | null
  | undefined
  | unknown
  | {
      message?: string;
      code?: string;
      type?: string;
      decline_code?: string;
      [key: string]: unknown;
    };
function mapStripeErrorToMessage(
  err: StripeError,
  t: ReturnType<typeof useTranslations<"checkout">>,
): string {
  if (!err) {
    return t("paymentErrors.couldNotComplete");
  }

  // Normalize into a raw string for fallback cleaning
  let raw: string;
  if (typeof err === "string") {
    raw = err;
  } else if (
    err &&
    typeof err === "object" &&
    "message" in err &&
    typeof err.message === "string"
  ) {
    raw = err.message;
  } else {
    raw = JSON.stringify(err ?? "");
  }
  raw = String(raw || "");

  // Try to parse as structured Stripe error JSON first (from our server)
  let errorObj: {
    type?: string;
    code?: string;
    message?: string;
    decline_code?: string;
    param?: string;
  } | null = null;

  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && parsed.type) {
      errorObj = parsed;
    }
  } catch (_) {
    // Not JSON, continue with raw parsing
  }

  // If we have structured error, use it directly
  if (errorObj) {
    const code = errorObj.code || errorObj.decline_code || errorObj.type;
    const message = errorObj.message;

    // Map error codes according to Stripe documentation
    switch (errorObj.type) {
      case "card_error":
        // Handle specific card error codes
        switch (code) {
          case "fraud_detected":
            return t("paymentErrors.fraudDetected");
          case "card_declined":
            return t("paymentErrors.cardDeclined");
          case "expired_card":
            return t("paymentErrors.expiredCard");
          case "insufficient_funds":
            return t("paymentErrors.insufficientFunds");
          case "lost_card":
            return t("paymentErrors.lostCard");
          case "stolen_card":
            return t("paymentErrors.stolenCard");
          case "incorrect_cvc":
            return t("paymentErrors.incorrectCvc");
          case "incorrect_number":
            return t("paymentErrors.incorrectNumber");
          case "processing_error":
            return t("paymentErrors.processingError");
          case "card_velocity_exceeded":
            return t("paymentErrors.tooManyAttempts");
          default:
            // Use message if available, otherwise generic card error
            return message || t("paymentErrors.cardDeclined");
        }

      case "invalid_request_error":
        return message || t("paymentErrors.invalidRequest");

      case "api_connection_error":
        return message || t("paymentErrors.connectionError");

      case "api_error":
        return message || t("paymentErrors.serviceError");

      case "authentication_error":
        return message || t("paymentErrors.authenticationError");

      case "rate_limit_error":
        return message || t("paymentErrors.rateLimit");

      case "idempotency_error":
        return message || t("paymentErrors.duplicateRequest");

      default:
        return message || t("paymentErrors.couldNotComplete");
    }
  }

  // Fallback: try to extract codes from unstructured error
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
  if (typeof err === "object" && err !== null && !Array.isArray(err)) {
    const errObj = err as Record<string, unknown>;
    code = (errObj.decline_code ||
      errObj.code ||
      errObj.type ||
      errObj.message) as string | null;
    // Convex sometimes wraps details inside an `info` / `details` / `payload` property
    if (!code) {
      const maybe =
        errObj.info ||
        errObj.details ||
        errObj.payload ||
        errObj.lastError ||
        errObj.error;
      if (maybe && typeof maybe === "object" && !Array.isArray(maybe)) {
        const maybeObj = maybe as Record<string, unknown>;
        code = (maybeObj.decline_code ||
          maybeObj.code ||
          maybeObj.type ||
          maybeObj.stripeCode) as string | null;
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
      return t("paymentErrors.insufficientFunds");
    case "lost_card":
      return t("paymentErrors.lostCard");
    case "stolen_card":
      return t("paymentErrors.stolenCard");
    case "generic_decline":
    case "card_declined":
      return t("paymentErrors.cardDeclined");
    case "expired_card":
      return t("paymentErrors.expiredCard");
    case "incorrect_cvc":
      return t("paymentErrors.incorrectCvc");
    case "processing_error":
      return t("paymentErrors.processingError");
    case "incorrect_number":
      return t("paymentErrors.incorrectNumber");
    case "card_velocity_exceeded":
      return t("paymentErrors.tooManyAttempts");
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
      return t("paymentErrors.couldNotComplete");
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

const phoneRegex = /^[+]?[\d\s()-]{6,}$/;

// Schema will be created with translations in component
const createCheckoutDetailsSchema = (
  t: ReturnType<typeof useTranslations<"checkout">>,
) =>
  z
    .object({
      customerName: z.string().min(2, t("validation.fullNameMin2Chars")),
      customerEmail: z
        .string()
        .min(1, t("validation.emailRequired"))
        .email(t("validation.validEmail")),
      phone: z
        .string()
        .optional()

        .refine(
          (value) => !value || phoneRegex.test(value.trim()),
          t("validation.validPhoneOrEmpty"),
        ),
      deliveryType: z.enum(["pickup", "delivery"]),
      pickupDateTime: z.string().optional(),
      address: z
        .object({
          streetAddress: z.string().optional(),
          city: z.string().optional(),
          postalCode: z.string().optional(),
          deliveryNotes: z.string().optional(),
        })
        .optional(),
      courierCityId: z.string().nullable().optional(),
    })
    .superRefine((data, ctx) => {
      // Require pickupDateTime for both pickup and delivery
      if (!data.pickupDateTime?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["pickupDateTime"],
          message: t("validation.pickupDateTimeRequired"),
        });
        return;
      }

      const selectedDate = new Date(data.pickupDateTime);
      const minDate = new Date();
      minDate.setDate(minDate.getDate() + STORE_INFO.orderPolicy.minPickupDays);
      minDate.setHours(0, 0, 0, 0);

      // Validate that date is not earlier than minimum days
      if (selectedDate < minDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["pickupDateTime"],
          message: t("validation.pickupDateMinDays", {
            days: STORE_INFO.orderPolicy.minPickupDays,
          }),
        });
      }

      if (data.deliveryType === "pickup") {
        // For pickup, address is not required and not validated
        return;
      }

      // For delivery, validate time constraints strictly
      if (data.deliveryType === "delivery") {
        const selectedHour = selectedDate.getHours();
        const selectedMinutes = selectedDate.getMinutes();

        // Check if hour is outside allowed range
        if (
          selectedHour < STORE_INFO.delivery.minDeliveryHour ||
          selectedHour > STORE_INFO.delivery.maxDeliveryHour
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["pickupDateTime"],
            message: t("validation.deliveryTimeRange", {
              min: STORE_INFO.delivery.minDeliveryHour,
              max: STORE_INFO.delivery.maxDeliveryHour,
            }),
          });
        }
        // If hour is exactly maxDeliveryHour, check that minutes are 0
        else if (
          selectedHour === STORE_INFO.delivery.maxDeliveryHour &&
          selectedMinutes > 0
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["pickupDateTime"],
            message: t("validation.deliveryTimeRange", {
              min: STORE_INFO.delivery.minDeliveryHour,
              max: STORE_INFO.delivery.maxDeliveryHour,
            }),
          });
        }
      }

      // For delivery, validate courier city and address
      if (!data.courierCityId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["courierCityId"],
          message: t("validation.selectCourierCity"),
        });
      }

      // For delivery, address is required and must be valid
      if (!data.address) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["address"],
          message: t("validation.addressRequiredForDelivery"),
        });
      } else {
        // Validate address fields for delivery
        const addressSchema = createAddressSchema(t);
        const addressResult = addressSchema.safeParse(data.address);
        if (!addressResult.success) {
          // Add all address field errors
          addressResult.error.issues.forEach((issue) => {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["address", ...issue.path],
              message: issue.message,
            });
          });
        }
      }
    });

// Type will be created with schema in component
type CheckoutDetailsFormValues = z.infer<
  ReturnType<typeof createCheckoutDetailsSchema>
>;

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
  const t = useTranslations("checkout");
  const stripe = useStripe();
  const elements = useElements();
  const [isPaying, setIsPaying] = useState(false);
  const [paymentRequest, setPaymentRequest] = useState<PaymentRequest | null>(
    null,
  );

  const isDisabled = isBusy || isAwaitingOrder || isPaying;

  const handleCardPayment = useCallback(async () => {
    if (!stripe || !elements) {
      toast.error(t("payment.stripeLoading"));
      return;
    }

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      toast.error(t("payment.cardNotReady"));
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
          result.error?.message ?? t("payment.couldNotCreatePaymentMethod"),
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
          ? mapStripeErrorToMessage(error.message, t)
          : mapStripeErrorToMessage(error, t),
      );
    } finally {
      setIsPaying(false);
    }
  }, [stripe, elements, customer, onSubmit, setErrorMessage, t]);

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
            ? mapStripeErrorToMessage(error.message, t)
            : mapStripeErrorToMessage(error, t),
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
  }, [stripe, totalMinor, onSubmit, setErrorMessage, t]);

  return (
    <div className="space-y-4">
      {paymentRequest && (
        <div
          className={`rounded-2xl border border-gray-200 bg-linear-to-br from-white to-gray-50 p-3 ${isDisabled ? "pointer-events-none opacity-70" : ""}`}
        >
          <p className="text-xs font-semibold tracking-wide text-gray-600 uppercase">
            {t("payment.expressCheckout")}
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
        <p>{t("payment.paymentProtected")}</p>
      </div>
      {errorMessage && (
        <p className="text-sm font-medium text-red-500" role="alert">
          {errorMessage}
        </p>
      )}
      {isAwaitingOrder && (
        <p className="text-sm font-medium text-gray-600">
          {t("payment.paymentConfirmed")}
        </p>
      )}
      <button
        type="button"
        onClick={handleCardPayment}
        disabled={!stripe || isDisabled}
        className="btn-accent w-full rounded-lg py-3 text-base font-semibold disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isDisabled
          ? t("payment.processing")
          : `${t("payment.pay")} ${amountLabel}`}
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
            <span className="bg-secondary/15 text-secondary rounded-full px-2 py-0.5 text-center text-xs font-medium">
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
  const t = useTranslations("checkout");
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
          <p className="text-xs text-gray-600">{t("delivery.courier")}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-gray-900">
            {formatCurrency(city.price)}
          </p>
        </div>
      </div>
      {selected && (
        <p className="text-secondary mt-3 text-xs font-medium">
          {t("delivery.selectedForDelivery")}
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
  const t = useTranslations("checkout");
  const tCommon = useTranslations("common");
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
          {t("orderSummary.title")}
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
                    {tCommon("quantity")}: {details.quantity}
                  </p>
                  {details.personalization && (
                    <div className="mt-1 space-y-0.5 text-xs text-gray-600">
                      {details.personalization.color && (
                        <p>
                          {tCommon("color")}: {details.personalization.color}
                        </p>
                      )}
                      {details.personalization.text && (
                        <p className="italic">
                          "{details.personalization.text}"
                        </p>
                      )}
                      {details.personalization.number && (
                        <p>
                          {tCommon("number")}: {details.personalization.number}
                        </p>
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
            <span>{t("orderSummary.itemsSubtotal")}</span>
            <span className="font-semibold">
              {formatCurrency(cartOnlyTotal)}
            </span>
          </div>
          {deliveryType === "delivery" && (
            <div className="flex items-center justify-between">
              <span>
                {t("orderSummary.delivery")}
                {selectedCourierCity ? ` (${selectedCourierCity.name})` : ""}
              </span>
              <span className="font-semibold">
                {formatCurrency(deliveryCost)}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between border-t pt-2 text-base font-bold text-gray-900">
            <span>{t("orderSummary.total")}</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>
      </div>
      <div className="rounded-3xl border border-white/50 bg-white/80 p-4 text-sm text-gray-700">
        <p className="font-semibold text-gray-900">
          {t("orderSummary.goodToKnow")}
        </p>
        <p className="mt-1">• {t("orderSummary.reserveAfterPayment")}</p>
        <p>• {t("orderSummary.productionUpTo72Hours")}</p>
        <p>• {t("orderSummary.cancellations48Hours")}</p>
        <p>• {t("orderSummary.coordinateViaWhatsApp")}</p>
      </div>
    </aside>
  );
}

export default function CheckoutPage() {
  const t = useTranslations("checkout");
  const router = useRouter();
  const user = useQuery(api.auth.loggedInUser);
  const isAuthenticated = Boolean(user);

  const checkoutDetailsSchema = createCheckoutDetailsSchema(t);

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
  const form = useForm<CheckoutDetailsFormValues>({
    resolver: zodResolver(
      checkoutDetailsSchema,
    ) as Resolver<CheckoutDetailsFormValues>,
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      customerName: user?.name ?? "",
      customerEmail: user?.email ?? "",
      phone: user?.phone ?? "",
      deliveryType: "pickup",
      pickupDateTime: "",
      address: user?.address ?? createEmptyAddressFields(),
      courierCityId: null,
    } as CheckoutDetailsFormValues,
  });
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("full_online");
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
  const deliveryType = form.watch("deliveryType");
  const pickupDateTime = form.watch("pickupDateTime") ?? "";
  const selectedCourierCityId = form.watch("courierCityId") ?? null;
  const customerName = form.watch("customerName");
  const customerEmail = form.watch("customerEmail");
  const phone = form.watch("phone") ?? "";
  const address = form.watch("address") ?? {
    streetAddress: "",
    city: "",
    postalCode: "",
    deliveryNotes: "",
  };

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

    // Handle both old string format and new object format
    let parsedAddress: AddressFields;
    if (typeof user.address === "string") {
      parsedAddress = parseAddress(user.address);
    } else if (user.address) {
      parsedAddress = user.address;
    } else {
      parsedAddress = createEmptyAddressFields();
    }

    const ensureValue = <K extends keyof CheckoutDetailsFormValues>(
      field: K,
      nextValue: CheckoutDetailsFormValues[K],
    ) => {
      const currentValue = form.getValues(field);
      if (
        !currentValue ||
        (typeof currentValue === "string" && !currentValue.trim())
      ) {
        form.setValue(field, nextValue as never, {
          shouldDirty: false,
          shouldValidate: false,
        });
      }
    };

    ensureValue("customerName", user.name ?? "");
    if (user.email) {
      form.setValue("customerEmail", user.email, {
        shouldDirty: false,
        shouldValidate: false,
      });
    }
    ensureValue("phone", user.phone ?? "");

    // Always update address if user has address data and current address is empty
    const currentAddress = form.getValues("address");
    const isCurrentAddressEmpty =
      !currentAddress ||
      (!currentAddress.streetAddress?.trim() &&
        !currentAddress.postalCode?.trim() &&
        !currentAddress.city?.trim());
    const hasUserAddress =
      parsedAddress.streetAddress?.trim() ||
      parsedAddress.postalCode?.trim() ||
      parsedAddress.city?.trim();

    if (isCurrentAddressEmpty && hasUserAddress) {
      // Set address object directly
      form.setValue(
        "address",
        {
          streetAddress: parsedAddress.streetAddress || "",
          city: parsedAddress.city || "",
          postalCode: parsedAddress.postalCode || "",
          deliveryNotes: parsedAddress.deliveryNotes || "",
        },
        {
          shouldDirty: false,
          shouldValidate: false,
        },
      );

      // Also set individual fields to ensure they're properly bound
      if (parsedAddress.streetAddress?.trim()) {
        form.setValue("address.streetAddress", parsedAddress.streetAddress, {
          shouldDirty: false,
          shouldValidate: false,
        });
      }
      if (parsedAddress.postalCode?.trim()) {
        form.setValue("address.postalCode", parsedAddress.postalCode, {
          shouldDirty: false,
          shouldValidate: false,
        });
      }
      if (parsedAddress.city?.trim()) {
        form.setValue("address.city", parsedAddress.city, {
          shouldDirty: false,
          shouldValidate: false,
        });
      }
      if (parsedAddress.deliveryNotes?.trim()) {
        form.setValue("address.deliveryNotes", parsedAddress.deliveryNotes, {
          shouldDirty: false,
          shouldValidate: false,
        });
      }
    }

    const currentCourier = form.getValues("courierCityId");
    if (!currentCourier) {
      try {
        const matched = COURIER_DELIVERY_CITIES.find((c) => {
          const candidate = parsedAddress.city.toLowerCase();
          return (
            c.name.toLowerCase() === candidate ||
            c.id.toLowerCase() === candidate
          );
        });
        if (matched) {
          form.setValue("courierCityId", matched.id, {
            shouldDirty: false,
            shouldValidate: false,
          });
        }
      } catch {
        // ignore parse errors — don't block checkout
      }
    }
  }, [user, form]);

  const deliveryCost =
    deliveryType === "delivery" && selectedCourierCity
      ? selectedCourierCity.price
      : 0;
  const total = cartOnlyTotal + deliveryCost;

  // Get shipping address directly from form values to ensure we use the latest input
  const shippingAddress = useMemo(() => {
    const formAddress = form.getValues("address");
    return {
      streetAddress: (
        formAddress?.streetAddress ||
        address.streetAddress ||
        ""
      ).trim(),
      city: (formAddress?.city || address.city || "").trim(),
      postalCode: (formAddress?.postalCode || address.postalCode || "").trim(),
      deliveryNotes: (
        formAddress?.deliveryNotes ||
        address.deliveryNotes ||
        ""
      ).trim(),
    };
  }, [address, form]);

  const _normalizedShippingAddress = useMemo(() => {
    return shippingAddress;
  }, [shippingAddress]);

  const isEmailReadOnly = Boolean(user?.email);
  const isFormValid = form.formState.isValid;

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

  const _cartSignature = useMemo(() => {
    return JSON.stringify({
      items: checkoutItems.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        personalization: item.personalization ?? null,
      })),
      deliveryType,
      pickupDateTime,
      address: shippingAddress,
      email: customerEmail,
      name: customerName,
      total,
      paymentMethod,
    });
  }, [
    checkoutItems,
    deliveryType,
    pickupDateTime,
    customerEmail,
    customerName,
    total,
    paymentMethod,
    shippingAddress,
  ]);

  const handleDeliveryTypeChange = (type: DeliveryType) => {
    form.setValue("deliveryType", type, {
      shouldDirty: true,
      shouldValidate: true,
    });
    if (type === "delivery") {
      // Keep pickupDateTime for delivery, just trigger validation
      form.trigger("pickupDateTime");
      if (!form.getValues("courierCityId")) {
        const currentAddress =
          form.getValues("address") ?? createEmptyAddressFields();
        form.setValue(
          "address",
          { ...currentAddress, city: "" },
          {
            shouldDirty: false,
            shouldValidate: false,
          },
        );
      }
    }
  };

  const handleCourierCitySelect = (cityId: string) => {
    const city = COURIER_DELIVERY_CITIES.find((option) => option.id === cityId);
    if (city) {
      const currentAddress =
        form.getValues("address") ?? createEmptyAddressFields();
      form.setValue(
        "address",
        { ...currentAddress, city: city.name },
        {
          shouldDirty: true,
          shouldValidate: true,
        },
      );
    }
  };

  const handlePaymentMethodChange = (method: PaymentMethod) => {
    setPaymentMethod(method);
    if (method === "cash") {
      setWhatsappConfirmed(false);
    }
  };

  const handleWhatsAppConfirm = () => {
    // Get all current values from form to ensure we use the latest input
    const formValues = form.getValues();
    const currentAddress = formValues.address ?? createEmptyAddressFields();
    const currentShippingAddress = {
      streetAddress: (currentAddress.streetAddress || "").trim(),
      city: (currentAddress.city || "").trim(),
      postalCode: (currentAddress.postalCode || "").trim(),
      deliveryNotes: (currentAddress.deliveryNotes || "").trim(),
    };
    const currentCustomerName = (formValues.customerName || "").trim();
    const currentCustomerEmail = (formValues.customerEmail || "").trim();
    const currentDeliveryType = formValues.deliveryType;
    const currentPickupDateTime = (formValues.pickupDateTime || "").trim();

    const itemsList = (itemsToDisplay ?? []).map((item) => {
      const name = isServerCartItem(item)
        ? item.product.name
        : item.product.name;
      const quantity = item.quantity;
      const personalization = item.personalization ?? null;
      return { name, quantity, personalization };
    });

    const message = WHATSAPP_MESSAGES.orderConfirmationDe(
      currentCustomerName,
      currentCustomerEmail,
      composeAddress(currentShippingAddress),
      currentDeliveryType,
      currentPickupDateTime,
      itemsList,
      Math.round(total * 100) / 100,
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
      const friendly = mapStripeErrorToMessage(paymentLookup.lastError, t);
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
      toast.success(t("validation.paymentConfirmedRedirecting"));
      router.replace(
        `/checkout/confirmant/${paymentLookup.orderId}` as Route<`/checkout/confirmant/${Id<"orders">}`>,
      );
    }
  }, [
    paymentLookup,
    pendingPaymentIntentId,
    isAuthenticated,
    clearGuestCart,
    router,
    t,
  ]);

  const handleCashCheckout = useCallback(async () => {
    const isReady = await form.trigger();
    if (!isReady) {
      toast.error(t("validation.addContactDetailsFirst"));
      return;
    }

    if (paymentMethod === "cash" && !whatsappConfirmed) {
      toast.error(t("validation.confirmWhatsAppFirst"));
      return;
    }

    if (!itemsToDisplay || itemsToDisplay.length === 0) {
      toast.error(t("validation.cartEmpty"));
      return;
    }

    // Get all current values from form to ensure we use the latest input
    const formValues = form.getValues();
    const currentAddress = formValues.address ?? createEmptyAddressFields();
    const currentShippingAddress = {
      streetAddress: (currentAddress.streetAddress || "").trim(),
      city: (currentAddress.city || "").trim(),
      postalCode: (currentAddress.postalCode || "").trim(),
      deliveryNotes: (currentAddress.deliveryNotes || "").trim(),
    };
    const currentCustomerName = (formValues.customerName || "").trim();
    const currentCustomerEmail = (formValues.customerEmail || "").trim();
    const _currentPhone = (formValues.phone || "").trim();
    const currentDeliveryType = formValues.deliveryType;
    const currentPickupDateTime = (formValues.pickupDateTime || "").trim();

    setIsCashSubmitting(true);
    try {
      let orderId: Id<"orders"> | null = null;

      if (isAuthenticated) {
        orderId = await createOrder({
          customerName: currentCustomerName,
          customerEmail: currentCustomerEmail,
          shippingAddress: currentShippingAddress,
          deliveryType: currentDeliveryType,
          paymentMethod,
          whatsappConfirmed:
            paymentMethod === "cash" ? whatsappConfirmed : undefined,
          pickupDateTime: currentPickupDateTime || undefined,
        });
      } else {
        orderId = await createGuestOrder({
          customerName: currentCustomerName,
          customerEmail: currentCustomerEmail,
          shippingAddress: currentShippingAddress,
          deliveryType: currentDeliveryType,
          paymentMethod,
          whatsappConfirmed:
            paymentMethod === "cash" ? whatsappConfirmed : undefined,
          pickupDateTime: currentPickupDateTime || undefined,
          items: guestItems.map((item) => ({
            productId: item.productId as Id<"products">,
            quantity: item.quantity,
          })),
        });
        clearGuestCart();
      }

      toast.success(t("validation.orderPlacedConfirmation"));
      router.replace(
        `/checkout/confirmant/${orderId}` as Route<`/checkout/confirmant/${Id<"orders">}`>,
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? mapStripeErrorToMessage(error.message, t)
          : mapStripeErrorToMessage(error, t),
      );
    } finally {
      setIsCashSubmitting(false);
    }
  }, [
    form,
    paymentMethod,
    whatsappConfirmed,
    itemsToDisplay,
    isAuthenticated,
    createOrder,
    createGuestOrder,
    guestItems,
    clearGuestCart,
    router,
    t,
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
      const isReady = await form.trigger();
      if (!isReady) {
        throw new Error(t("validation.fillContactDetailsToContinue"));
      }
      if (checkoutItems.length === 0) {
        throw new Error(t("validation.cartEmpty"));
      }

      setIsSubmittingPayment(true);
      setPaymentError(null);

      const finalizeSuccessfulPayment = async (paymentIntentId: string) => {
        const syncResult = await syncStripePaymentIntent({
          paymentIntentId,
        });

        if (!syncResult) {
          throw new Error(t("validation.couldNotSyncPayment"));
        }

        if (syncResult.status === "failed") {
          // sanitize server error before throwing so UI never shows raw Convex payload
          throw new Error(
            mapStripeErrorToMessage(syncResult.lastError ?? null, t),
          );
        }

        setPendingPaymentIntentId(paymentIntentId);
        setIsAwaitingOrder(true);
      };

      // Get all current values from form to ensure we use the latest input
      const formValues = form.getValues();
      const currentAddress = formValues.address ?? createEmptyAddressFields();
      const currentShippingAddress = {
        streetAddress: (currentAddress.streetAddress || "").trim(),
        city: (currentAddress.city || "").trim(),
        postalCode: (currentAddress.postalCode || "").trim(),
        deliveryNotes: (currentAddress.deliveryNotes || "").trim(),
      };
      const currentCustomerName = (formValues.customerName || "").trim();
      const currentCustomerEmail = (formValues.customerEmail || "").trim();
      const currentPhone = (formValues.phone || "").trim();
      const currentDeliveryType = formValues.deliveryType;
      const currentPickupDateTime = (formValues.pickupDateTime || "").trim();

      // Recalculate cart signature with current form values to ensure data integrity
      const currentCartSignature = JSON.stringify({
        items: checkoutItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          personalization: item.personalization ?? null,
        })),
        deliveryType: currentDeliveryType,
        pickupDateTime: currentPickupDateTime,
        address: currentShippingAddress,
        email: currentCustomerEmail,
        name: currentCustomerName,
        total,
        paymentMethod,
      });

      try {
        const response = await submitStripePayment({
          items: checkoutItems,
          customer: {
            name: currentCustomerName,
            email: currentCustomerEmail,
            phone: currentPhone || undefined,
          },
          shipping: {
            address: currentShippingAddress,
            deliveryType: currentDeliveryType,
            pickupDateTime: currentPickupDateTime || undefined,
            deliveryFee: deliveryCost || undefined,
          },
          paymentCurrency: PAYMENT_CURRENCY,
          displayAmount: {
            value: Number(total.toFixed(2)),
            currency: DISPLAY_CURRENCY,
          },
          paymentMethodId,
          cartSignature: currentCartSignature,
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
              error.message ?? t("paymentErrors.additionalVerification"),
            );
          }
          await finalizeSuccessfulPayment(response.paymentIntentId);
          toast.success(t("payment.paymentConfirmed"));
          return;
        }

        if (
          response.status === "succeeded" ||
          response.status === "processing"
        ) {
          await finalizeSuccessfulPayment(response.paymentIntentId);
          toast.success(t("payment.paymentConfirmed"));
          return;
        }

        // Map server lastError to friendly message
        throw new Error(mapStripeErrorToMessage(response.lastError ?? null, t));
      } catch (error) {
        const message =
          error instanceof Error
            ? mapStripeErrorToMessage(error.message, t)
            : mapStripeErrorToMessage(error, t);
        setPaymentError(message);
        // rethrow so parent flows can catch if they want
        throw new Error(message);
      } finally {
        setIsSubmittingPayment(false);
      }
    },
    [
      form,
      checkoutItems,
      submitStripePayment,
      deliveryCost,
      total,
      paymentMethod,
      syncStripePaymentIntent,
      t,
    ],
  );

  const proceedToPaymentStep = async () => {
    // Trigger validation for all fields to show errors
    const isReady = await form.trigger();
    if (!isReady) {
      // Wait a bit for error messages to render, then scroll to first error
      setTimeout(() => {
        // Get the first field with an error from formState
        const errors = form.formState.errors;
        let firstErrorField: string | null = null;

        // Find first error field by traversing the errors object
        const findFirstError = (
          obj: Record<string, unknown>,
          path = "",
        ): string | null => {
          for (const key in obj) {
            const currentPath = path ? `${path}.${key}` : key;
            const value = obj[key];

            if (value && typeof value === "object" && "message" in value) {
              return currentPath;
            }

            if (value && typeof value === "object" && !Array.isArray(value)) {
              const nested = findFirstError(
                value as Record<string, unknown>,
                currentPath,
              );
              if (nested) return nested;
            }
          }
          return null;
        };

        firstErrorField = findFirstError(errors as Record<string, unknown>);

        // Try to find the error element by field name or by role="alert"
        let errorElement: Element | null = null;

        if (firstErrorField) {
          // Try to find input/field by name attribute
          const fieldName = firstErrorField.replace(/\./g, "-");
          errorElement = document.querySelector(
            `[name="${firstErrorField}"], [name*="${fieldName}"]`,
          );
        }

        // Fallback: find first error message by role="alert"
        if (!errorElement) {
          errorElement = document.querySelector('[role="alert"]');
        }

        if (errorElement) {
          // Scroll to the form item containing the error
          const formItem = errorElement.closest('[data-slot="form-item"]');
          if (formItem) {
            formItem.scrollIntoView({ behavior: "smooth", block: "center" });
          } else {
            // If no form item, try to find the input field
            const inputField = errorElement.closest("input, textarea, select");
            if (inputField) {
              inputField.scrollIntoView({
                behavior: "smooth",
                block: "center",
              });
            } else {
              errorElement.scrollIntoView({
                behavior: "smooth",
                block: "center",
              });
            }
          }
        }
      }, 150);
      return;
    }
    setCurrentStep(2);

    // Smooth scroll to the top of the checkout form container
    if (typeof window !== "undefined") {
      try {
        const mainEl = document.querySelector("main.container");
        const top = mainEl
          ? mainEl.getBoundingClientRect().top + window.scrollY
          : 0;
        window.scrollTo({ top, behavior: "smooth" });
      } catch (_e) {
        // fail silently if scrolling is not available
      }
    }
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
              {t("emptyCart.title")}
            </h2>
            <p className="mt-2 text-gray-600">{t("emptyCart.description")}</p>
            <button
              type="button"
              onClick={() => router.push("/catalog")}
              className="btn-accent mt-6 rounded-full px-6 py-3 text-base font-semibold"
            >
              {t("emptyCart.browseCatalog")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <section className="container mx-auto min-h-screen px-4 py-6 sm:py-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-white/20 bg-white/70 p-4 shadow-sm backdrop-blur">
          <button
            type="button"
            onClick={() => router.push("/cart")}
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 transition hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("backToCart")}
          </button>
          <StepIndicator currentStep={currentStep} t={t} />
        </header>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="space-y-6">
            {currentStep === 1 ? (
              <StepOne
                form={form}
                deliveryType={deliveryType}
                selectedCourierCity={selectedCourierCity}
                courierCities={COURIER_DELIVERY_CITIES}
                onCourierCitySelect={handleCourierCitySelect}
                handleDeliveryTypeChange={handleDeliveryTypeChange}
                proceedToPaymentStep={proceedToPaymentStep}
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
                  name: customerName,
                  email: customerEmail,
                  phone,
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
    </section>
  );
}

type StepOneProps = {
  form: UseFormReturn<CheckoutDetailsFormValues>;
  deliveryType: DeliveryType;
  selectedCourierCity?: CourierDeliveryCity;
  courierCities: CourierDeliveryCity[];
  onCourierCitySelect: (cityId: string) => void;
  handleDeliveryTypeChange: (type: DeliveryType) => void;
  proceedToPaymentStep: () => Promise<void>;
  isEmailReadOnly: boolean;
};

function StepOne({
  form,
  deliveryType,
  selectedCourierCity,
  courierCities,
  onCourierCitySelect,
  handleDeliveryTypeChange,
  proceedToPaymentStep,
  isEmailReadOnly,
}: StepOneProps) {
  const t = useTranslations("checkout");
  const tCommon = useTranslations("common");
  return (
    <Form {...form}>
      <div className="space-y-6">
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">
            {t("contactDetails.title")}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {t("contactDetails.description")}
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="customerName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <User className="h-4 w-4" /> {t("contactDetails.fullName")}
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g., Anna Mayer"
                      autoComplete="name"
                      className="rounded-xl border-gray-200 px-4 py-3 text-base"
                      maxLength={100}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="customerEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <Mail className="h-4 w-4" />{" "}
                    {t("contactDetails.emailForReceipts")}
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="email"
                      readOnly={isEmailReadOnly}
                      placeholder="you@example.com"
                      autoComplete="email"
                      className={`px-4 py-3 text-base ${
                        isEmailReadOnly ? "bg-gray-50 text-gray-500" : ""
                      }`}
                      maxLength={100}
                    />
                  </FormControl>

                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <Phone className="h-4 w-4" />{" "}
                    {t("contactDetails.phoneNumberOptional")}
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="tel"
                      placeholder={t("contactDetails.includeCountryCode")}
                      autoComplete="tel"
                      className="rounded-xl border-gray-200 px-4 py-3 text-base"
                      maxLength={30}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">
            {t("delivery.title")}
          </h2>
          <div className="mt-4 space-y-3">
            <OptionCard
              icon={<Store className="text-secondary h-5 w-5" />}
              title={t("delivery.selfPickup")}
              description={`${STORE_INFO.address.street}, ${STORE_INFO.address.city}`}
              selected={deliveryType === "pickup"}
              onSelect={() => handleDeliveryTypeChange("pickup")}
              badge={t("delivery.popular")}
            />
            <OptionCard
              icon={<Truck className="text-secondary h-5 w-5" />}
              title={`${t("delivery.courierDelivery")} (${t("delivery.hours", {
                start: String(STORE_INFO.delivery.minDeliveryHour).padStart(
                  2,
                  "0",
                ),
                end: String(STORE_INFO.delivery.maxDeliveryHour).padStart(
                  2,
                  "0",
                ),
              })})`}
              description={
                selectedCourierCity
                  ? `+${formatCurrency(selectedCourierCity.price)}`
                  : t("delivery.chooseYourCity")
              }
              selected={deliveryType === "delivery"}
              onSelect={() => handleDeliveryTypeChange("delivery")}
            />
          </div>
          <FormField
            control={form.control}
            name="pickupDateTime"
            render={({ field }) => {
              const isDelivery = deliveryType === "delivery";
              const minDateTime = isDelivery
                ? getMinDeliveryDateTime()
                : getMinPickupDateTime();
              const maxDateTime = isDelivery
                ? getMaxDeliveryDateTime()
                : undefined;
              const minDate = new Date(minDateTime);

              const validateAndSetValue = (value: string) => {
                if (!value) {
                  field.onChange("");
                  return;
                }

                const selectedDate = new Date(value);

                // If selected date is before minimum, set to minimum
                if (selectedDate < minDate) {
                  field.onChange(minDateTime);
                  // Trigger validation to show error message
                  setTimeout(() => {
                    form.trigger("pickupDateTime");
                  }, 0);
                  return;
                }

                // For delivery, validate time constraints strictly
                if (isDelivery) {
                  const selectedHour = selectedDate.getHours();
                  const selectedMinutes = selectedDate.getMinutes();

                  // Check if hour is outside allowed range
                  if (
                    selectedHour < STORE_INFO.delivery.minDeliveryHour ||
                    selectedHour > STORE_INFO.delivery.maxDeliveryHour
                  ) {
                    // Adjust to valid time range
                    const adjustedDate = new Date(selectedDate);
                    if (selectedHour < STORE_INFO.delivery.minDeliveryHour) {
                      adjustedDate.setHours(
                        STORE_INFO.delivery.minDeliveryHour,
                        0,
                        0,
                        0,
                      );
                    } else if (
                      selectedHour > STORE_INFO.delivery.maxDeliveryHour
                    ) {
                      adjustedDate.setHours(
                        STORE_INFO.delivery.maxDeliveryHour,
                        0,
                        0,
                        0,
                      );
                    }
                    field.onChange(adjustedDate.toISOString().slice(0, 16));
                    setTimeout(() => {
                      form.trigger("pickupDateTime");
                    }, 0);
                    return;
                  }
                  // If hour is exactly maxDeliveryHour, ensure minutes are 0
                  else if (
                    selectedHour === STORE_INFO.delivery.maxDeliveryHour &&
                    selectedMinutes > 0
                  ) {
                    const adjustedDate = new Date(selectedDate);
                    adjustedDate.setHours(
                      STORE_INFO.delivery.maxDeliveryHour,
                      0,
                      0,
                      0,
                    );
                    field.onChange(adjustedDate.toISOString().slice(0, 16));
                    setTimeout(() => {
                      form.trigger("pickupDateTime");
                    }, 0);
                    return;
                  }
                }

                field.onChange(value);
              };

              const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
                const value = e.target.value;
                validateAndSetValue(value);
              };

              const handleBlur = (e: FocusEvent<HTMLInputElement>) => {
                const value = e.target.value;
                validateAndSetValue(value);
                field.onBlur();
              };

              return (
                <FormItem className="mt-4 flex flex-col gap-2">
                  <FormLabel className="text-sm font-medium text-gray-700">
                    {isDelivery
                      ? t("delivery.preferredDeliveryDateTime")
                      : t("delivery.preferredPickupDateTime")}{" "}
                    (
                    {t("delivery.daysAheadMinimum", {
                      count: STORE_INFO.orderPolicy.minPickupDays,
                    })}
                    )
                    {isDelivery &&
                      ` ${STORE_INFO.delivery.minDeliveryHour}:00-${STORE_INFO.delivery.maxDeliveryHour}:00`}
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="datetime-local"
                      min={minDateTime}
                      max={maxDateTime}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      className="rounded-xl border-gray-200 px-4 py-3 text-base"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              );
            }}
          />
        </div>

        {deliveryType === "delivery" && (
          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">
              {t("delivery.deliveryDetails")}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {t("delivery.addressPrefilled")}
            </p>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="courierCityId"
                render={({ field }) => (
                  <FormItem className="space-y-3 md:col-span-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">
                        {t("delivery.courierServiceAreas")}
                      </span>
                      <span className="text-xs text-gray-500">
                        {t("delivery.tapCityToSelect")}
                      </span>
                    </div>
                    <FormControl>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {courierCities.map((city) => (
                          <CourierCityCard
                            key={city.id}
                            city={city}
                            selected={(field.value ?? null) === city.id}
                            onSelect={() => {
                              field.onChange(city.id);
                              onCourierCitySelect(city.id);
                            }}
                          />
                        ))}
                      </div>
                    </FormControl>
                    <p className="text-xs text-gray-500">
                      {t("delivery.needAnotherCity")}
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address.streetAddress"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <MapPin className="h-4 w-4" />{" "}
                      {t("delivery.streetAndHouseNumber")}
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={tCommon("exampleAddress")}
                        autoComplete="address-line1"
                        className="rounded-xl border-gray-200 px-4 py-3 text-base"
                        maxLength={200}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address.postalCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700">
                      {t("delivery.postalCode")}
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="1070"
                        autoComplete="postal-code"
                        className="rounded-xl border-gray-200 px-4 py-3 text-base"
                        maxLength={10}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address.deliveryNotes"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel className="text-sm font-medium text-gray-700">
                      {t("delivery.notesForCourier")}
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        rows={3}
                        placeholder={t("delivery.doorCodeFloor")}
                        autoComplete="address-line2"
                        className="rounded-2xl border-gray-200 px-4 py-3 text-sm"
                        maxLength={500}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        )}

        <div className="border-secondary/40 bg-secondary/5 flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-dashed px-6 py-4">
          <div>
            <p className="text-sm font-semibold text-gray-900">
              {t("stepIndicator.step1Of2")}
            </p>
            <p className="text-xs text-gray-600">
              {t("stepIndicator.continueToPayments")}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              void proceedToPaymentStep();
            }}
            className="btn-accent rounded-full px-6 py-3 text-sm font-semibold"
          >
            {t("stepIndicator.goToPayment")}
          </button>
        </div>
      </div>
    </Form>
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
  const t = useTranslations("checkout");
  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">
          {t("payment.title")}
        </h2>
        <div className="mt-4 space-y-3">
          <OptionCard
            icon={<CreditCard className="text-secondary h-5 w-5" />}
            title={t("payment.instantOnlinePayment")}
            description={t("payment.viaCardOrLink")}
            selected={paymentMethod === "full_online"}
            onSelect={() => setPaymentMethod("full_online")}
          />
          <OptionCard
            icon={<DollarSign className="text-secondary h-5 w-5" />}
            title={t("payment.payDuringPickup")}
            description={t("payment.confirmWhatsApp")}
            selected={paymentMethod === "cash"}
            onSelect={() => setPaymentMethod("cash")}
            disabled={deliveryType !== "pickup"}
            badge={
              deliveryType === "pickup" ? undefined : t("payment.pickupOnly")
            }
          />
        </div>
      </div>

      {paymentMethod === "full_online" && (
        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <h3 className="text-base font-semibold text-gray-900">
            {t("payment.secureOnlineCheckout")}
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
            {t("payment.confirmViaWhatsApp")}
          </h3>
          <div className="mt-4 space-y-4">
            <div className="border-secondary/40 bg-secondary/5 rounded-2xl border border-dashed p-4 text-sm text-gray-700">
              <p>{t("payment.sendWhatsAppMessage")}</p>
              <p className="mt-1">{t("payment.textBeforeVisiting")}</p>
            </div>
            <button
              type="button"
              onClick={handleWhatsAppConfirm}
              disabled={!isFormValid}
              className="flex w-full items-center justify-center gap-3 rounded-2xl bg-[#111B21] px-4 py-2 text-[#FCF5EB] shadow-md transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span className="flex size-10 items-center justify-center rounded-lg bg-[#25D366]">
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
                {t("payment.messageUsOnWhatsApp")}
              </span>
            </button>
            {whatsappConfirmed && (
              <p className="text-secondary text-sm font-medium">
                {t("payment.messageSent")}
              </p>
            )}
            <button
              type="button"
              onClick={handleCashCheckout}
              disabled={!whatsappConfirmed || isCashSubmitting}
              className="btn-accent w-full rounded-2xl py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isCashSubmitting
                ? t("payment.savingOrder")
                : t("payment.reservePickupSlot")}
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
          {t("stepIndicator.backToStep1")}
        </button>
        <p className="text-sm font-semibold text-gray-900">
          {t("stepIndicator.step2Of2")}
        </p>
      </div>
    </div>
  );
}

function StepIndicator({
  currentStep,
  t,
}: {
  currentStep: number;
  t: ReturnType<typeof useTranslations<"checkout">>;
}) {
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
            {t(step.titleKey)}
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
    <div className="container mx-auto px-4 py-6 sm:py-10">
      <div className="mx-auto max-w-6xl animate-pulse space-y-6">
        <div className="h-16 rounded-3xl bg-white/70" />
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-4">
            {Array.from({ length: 2 }).map((_, idx) => (
              <div
                key={`skeleton-card-${idx}`}
                className="h-68.5 rounded-3xl bg-white"
              />
            ))}
          </div>
          <div className="h-64 rounded-3xl bg-white" />
        </div>
      </div>
    </div>
  );
}
