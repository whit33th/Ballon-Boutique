import { render } from "@react-email/components";
import { NextResponse } from "next/server";
import OrderConfirmationEmail, {
  type OrderConfirmationEmailProps,
} from "@/emails/OrderConfirmation";
import { sendEmail } from "@/lib/mailer";

export const runtime = "nodejs";

interface SendOrderEmailRequest {
  orderId: string;
  customerName: string;
  customerEmail: string;
  items: OrderConfirmationEmailProps["items"];
  totalAmount: number;
  grandTotal?: number;
  deliveryFee?: number;
  deliveryType: "pickup" | "delivery";
  paymentMethod?: "full_online" | "partial_online" | "cash";
  pickupDateTime?: string;
  shippingAddress?: OrderConfirmationEmailProps["shippingAddress"];
  currency?: string;
  confirmationUrl?: string;
}

export async function POST(request: Request) {
  try {
    const internalSecret = process.env.INTERNAL_EMAIL_WEBHOOK_SECRET;
    if (internalSecret) {
      const provided = request.headers.get("x-internal-secret");
      if (!provided || provided !== internalSecret) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const body: SendOrderEmailRequest = await request.json();

    if (!body.orderId || !body.customerEmail || !body.customerName) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: orderId, customerEmail, customerName",
        },
        { status: 400 },
      );
    }

    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL || "https://ballon.boutique";
    const confirmationUrl =
      body.confirmationUrl ?? `${baseUrl}/checkout/confirmant/${body.orderId}`;

    const emailHtml = await render(
      OrderConfirmationEmail({
        orderId: body.orderId,
        customerName: body.customerName,
        customerEmail: body.customerEmail,
        items: body.items,
        totalAmount: body.totalAmount,
        grandTotal: body.grandTotal,
        deliveryFee: body.deliveryFee,
        deliveryType: body.deliveryType,
        paymentMethod: body.paymentMethod,
        pickupDateTime: body.pickupDateTime,
        shippingAddress: body.shippingAddress,
        currency: body.currency || "EUR",
        confirmationUrl,
      }),
    );

    const textContent = `
Ballon Boutique - Bestellbestätigung

Hallo ${body.customerName},

Ihre Bestellung wurde bestätigt!

Bestellreferenz: ${body.orderId}
Gesamt: €${(body.grandTotal ?? body.totalAmount).toFixed(2)}

Artikel:
${body.items
  .map(
    (item) =>
      `- ${item.productName} x${item.quantity}: €${(item.price * item.quantity).toFixed(2)}`,
  )
  .join("\n")}

Lieferart: ${body.deliveryType === "pickup" ? "Selbstabholung" : "Kurierlieferung"}
${body.pickupDateTime ? `Datum: ${new Date(body.pickupDateTime).toLocaleDateString("de-AT")}` : ""}

Sie können Ihre Bestellung online unter folgendem Link einsehen:
${confirmationUrl}

Bei Fragen kontaktieren Sie uns:
Email: ballonboutique.at@gmail.com
Tel: +43 690 200 84085
    `.trim();

    const success = await sendEmail({
      to: body.customerEmail,
      subject: `Bestellbestätigung #${body.orderId.slice(-8)} - Ballon Boutique`,
      html: emailHtml,
      text: textContent,
    });

    if (!success) {
      return NextResponse.json(
        { error: "Failed to send email" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[send-order-email] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
