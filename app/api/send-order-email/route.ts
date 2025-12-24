import { render } from "@react-email/components";
import { NextResponse } from "next/server";
import OrderConfirmationEmail, {
  type OrderConfirmationEmailProps,
} from "@/components/emails/OrderConfirmation";
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
}

export async function POST(request: Request) {
  try {
    const body: SendOrderEmailRequest = await request.json();

    // Validate required fields
    if (!body.orderId || !body.customerEmail || !body.customerName) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: orderId, customerEmail, customerName",
        },
        { status: 400 },
      );
    }

    // Build confirmation URL
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || "https://ballon-boutique.vercel.app";
    const confirmationUrl = `${baseUrl}/checkout/confirmant/${body.orderId}`;

    // Render email HTML
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

    // Create plain text version for email clients that don't support HTML
    const textContent = `
Ballon Boutique - Bestellbestätigung

Hallo ${body.customerName},

Ihre Bestellung wurde bestätigt!

Bestellreferenz: ${body.orderId}
Gesamt: €${(body.grandTotal ?? body.totalAmount).toFixed(2)}

Artikel:
${body.items.map((item) => `- ${item.productName} x${item.quantity}: €${(item.price * item.quantity).toFixed(2)}`).join("\n")}

Lieferart: ${body.deliveryType === "pickup" ? "Selbstabholung" : "Kurierlieferung"}
${body.pickupDateTime ? `Datum: ${new Date(body.pickupDateTime).toLocaleString("de-AT")}` : ""}

Sie können Ihre Bestellung online unter folgendem Link einsehen:
${confirmationUrl}

Bei Fragen kontaktieren Sie uns:
Email: ballonboutique.at@gmail.com
Tel: +43 690 200 84085

Vielen Dank für Ihren Einkauf!
Ballon Boutique
    `.trim();

    // Send email
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
