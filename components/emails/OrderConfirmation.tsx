import {
  Body,
  Column,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Text,
} from "@react-email/components";

// Order types matching the Convex schema
interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  personalization?: {
    text?: string;
    color?: string;
    number?: string;
  };
  productImageUrl?: string | null;
}

interface ShippingAddress {
  streetAddress: string;
  city: string;
  postalCode: string;
  deliveryNotes?: string;
}

export interface OrderConfirmationEmailProps {
  orderId: string;
  customerName: string;
  customerEmail: string;
  items: OrderItem[];
  totalAmount: number;
  grandTotal?: number;
  deliveryFee?: number;
  deliveryType: "pickup" | "delivery";
  paymentMethod?: "full_online" | "partial_online" | "cash";
  pickupDateTime?: string;
  shippingAddress?: ShippingAddress | string;
  currency?: string;
  confirmationUrl: string;
}

// Store info (hardcoded to avoid import issues in email context)
const STORE = {
  name: "Ballon Boutique",
  slogan: "Wenn Momente zu Emotionen werden",
  email: "ballonboutique.at@gmail.com",
  phone: "+43 690 200 84085",
  address: "Sandgasse 3/3, 8720 Knittelfeld, Austria",
  website: "https://ballon-boutique.vercel.app",
  logoUrl: "https://ballon-boutique.vercel.app/logo.png",
};

// Translation strings (German - primary language)
const t = {
  previewText: "Ihre Bestellung bei Ballon Boutique wurde bestätigt!",
  titleFull: "Zahlung erhalten — Bestellung bestätigt",
  titlePartial: "Bestellung bestätigt",
  titleCash: "Bestellung reserviert — Zahlung bei Abholung",
  description:
    "Wir haben Ihre Artikel reserviert. Die Details finden Sie unten.",
  checkoutDone: "Checkout abgeschlossen",
  pickupPill: "Abholdatum",
  orderReference: "Bestellreferenz",
  totalPaid: "Gesamt bezahlt",
  status: "Status",
  delivery: "Lieferung",
  payment: "Zahlung",
  itemsReserved: "Reservierte Artikel",
  whereWeDeliver: "Lieferadresse",
  pickupAddress: "Abholadresse",
  pickupWindow: "Abholdatum",
  deliveryWindow: "Lieferdatum",
  deliveryFee: "Liefergebühr",
  subtotal: "Zwischensumme",
  quantity: "Menge",
  color: "Farbe",
  text: "Text",
  number: "Nummer",
  viewOnline: "Online ansehen",
  questions: "Fragen? Kontaktieren Sie uns:",
  orderStatus: {
    pending: "Ausstehend",
    confirmed: "Bestätigt",
  },
  paymentMethod: {
    full_online: "Vollständige Online-Zahlung",
    partial_online: "Teilweise Online-Zahlung",
    cash: "Barzahlung bei Abholung",
  },
  deliveryType: {
    pickup: "Selbstabholung",
    delivery: "Kurierlieferung",
  },
};

const formatCurrency = (value: number, currency = "EUR") =>
  new Intl.NumberFormat("de-AT", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);

const formatDateTime = (dateString: string) =>
  new Date(dateString).toLocaleDateString("de-AT", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

// Inline styles for email compatibility
const styles = {
  main: {
    backgroundColor: "#f7f1e6",
    fontFamily:
      '"DM Sans", "Manrope", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
  },
  container: {
    backgroundColor: "#ffffff",
    margin: "32px auto",
    padding: "0 0 28px",
    maxWidth: "680px",
    borderRadius: "24px",
    boxShadow: "0 20px 50px rgba(0,0,0,0.05)",
  },
  header: {
    textAlign: "center" as const,
    padding: "36px 32px 28px",
    backgroundColor: "#dbeef6",
    borderRadius: "24px 24px 0 0",
  },
  logo: {
    width: "72px",
    height: "72px",
    margin: "0 auto 16px",
  },
  heading: {
    fontSize: "26px",
    fontWeight: "700",
    color: "#0f1624",
    margin: "6px 0 10px",
  },
  subheading: {
    fontSize: "15px",
    color: "#4b5563",
    margin: "0",
  },
  smallKicker: {
    fontSize: "12px",
    fontWeight: "700",
    color: "#3b5565",
    letterSpacing: "0.12em",
    textTransform: "uppercase" as const,
    margin: "0",
  },
  pill: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    backgroundColor: "#f2f8fb",
    borderRadius: "999px",
    padding: "10px 16px",
    color: "#1b4f5f",
    fontWeight: "600",
    fontSize: "14px",
    border: "1px solid #d5e6ed",
  },
  section: {
    backgroundColor: "#f9fafb",
    borderRadius: "14px",
    padding: "18px 20px",
    marginBottom: "16px",
    border: "1px solid #e6ecf2",
  },
  sectionTitle: {
    fontSize: "12px",
    fontWeight: "700",
    color: "#6b7280",
    textTransform: "uppercase" as const,
    letterSpacing: "0.1em",
    margin: "0 0 12px",
  },
  badge: {
    display: "inline-block",
    backgroundColor: "#e3f3e8",
    color: "#24783d",
    fontSize: "11px",
    fontWeight: "600",
    padding: "6px 12px",
    borderRadius: "12px",
    textTransform: "uppercase" as const,
    border: "1px solid #cae8d3",
  },
  infoRow: {
    marginBottom: "8px",
  },
  infoLabel: {
    fontSize: "11px",
    fontWeight: "700",
    color: "#7b8696",
    textTransform: "uppercase" as const,
    marginBottom: "2px",
  },
  infoValue: {
    fontSize: "14px",
    color: "#111827",
    fontWeight: "600",
  },
  itemCard: {
    backgroundColor: "#ffffff",
    border: "1px solid #e6ecf2",
    borderRadius: "12px",
    padding: "14px",
    marginBottom: "10px",
  },
  itemName: {
    fontSize: "14px",
    fontWeight: "700",
    color: "#0f172a",
    margin: "0 0 6px",
  },
  itemDetail: {
    fontSize: "12px",
    color: "#6b7280",
    margin: "2px 0",
  },
  itemPrice: {
    fontSize: "14px",
    fontWeight: "700",
    color: "#0f172a",
    textAlign: "right" as const,
  },
  totalRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: "12px",
    borderTop: "1px dashed #ddd",
    marginTop: "12px",
  },
  totalLabel: {
    fontSize: "14px",
    fontWeight: "500",
    color: "#1a1a1a",
  },
  totalValue: {
    fontSize: "20px",
    fontWeight: "700",
    color: "#0f172a",
  },
  button: {
    display: "block",
    backgroundColor: "#e4522f",
    color: "#ffffff",
    fontSize: "15px",
    fontWeight: "700",
    padding: "16px 28px",
    borderRadius: "14px",
    textDecoration: "none",
    textAlign: "center" as const,
  },
  footer: {
    textAlign: "center" as const,
    marginTop: "32px",
    paddingTop: "24px",
    borderTop: "1px solid #eee",
  },
  footerText: {
    fontSize: "12px",
    color: "#888888",
    margin: "4px 0",
  },
  footerLink: {
    color: "#0f172a",
    textDecoration: "none",
  },
  divider: {
    borderColor: "#e6ecf2",
    margin: "16px 0",
  },
};

export function OrderConfirmationEmail({
  orderId,
  customerName,
  items,
  totalAmount,
  grandTotal,
  deliveryFee = 0,
  deliveryType,
  paymentMethod,
  pickupDateTime,
  shippingAddress,
  currency = "EUR",
  confirmationUrl,
}: OrderConfirmationEmailProps) {
  const finalTotal = grandTotal ?? totalAmount;
  const subtotal = items.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0,
  );

  const getTitle = () => {
    if (paymentMethod === "cash") return t.titleCash;
    if (paymentMethod === "full_online") return t.titleFull;
    return t.titlePartial;
  };

  const formatAddress = (addr: ShippingAddress | string | undefined) => {
    if (!addr) return "—";
    if (typeof addr === "string") return addr;
    return `${addr.streetAddress}\n${addr.postalCode} ${addr.city}`;
  };

  return (
    <Html>
      <Head />
      <Preview>{t.previewText}</Preview>
      <Body style={styles.main}>
        <Container style={styles.container}>
          {/* Header */}
          <Section style={styles.header}>
            <Text style={styles.smallKicker}>{t.checkoutDone}</Text>
            <Img
              src={STORE.logoUrl}
              alt={STORE.name}
              width="80"
              height="80"
              style={{
                margin: "12px auto",
                display: "block",
                borderRadius: "16px",
              }}
            />
            <Heading style={styles.heading}>{getTitle()}</Heading>
            <Text style={styles.subheading}>{t.description}</Text>
            {pickupDateTime && (
              <div style={{ marginTop: "18px" }}>
                <div style={styles.pill}>
                  <span>
                    {t.pickupPill}: {formatDateTime(pickupDateTime)}
                  </span>
                </div>
              </div>
            )}
          </Section>

          {/* Order Info */}
          <Section style={{ padding: "22px 24px" }}>
            <Section style={{ ...styles.section, marginBottom: "18px" }}>
              <Row>
                <Column style={{ width: "70%" }}>
                  <Text style={styles.infoLabel}>{t.orderReference}</Text>
                  <Text
                    style={{
                      ...styles.infoValue,
                      fontFamily: "monospace",
                      fontSize: "13px",
                    }}
                  >
                    {orderId}
                  </Text>
                </Column>
                <Column style={{ textAlign: "right", width: "30%" }}>
                  <Text style={styles.infoLabel}>{t.totalPaid}</Text>
                  <Text
                    style={{
                      ...styles.infoValue,
                      fontSize: "18px",
                      fontWeight: "800",
                      color: "#0f172a",
                    }}
                  >
                    {formatCurrency(finalTotal, currency)}
                  </Text>
                </Column>
              </Row>

              <Hr style={styles.divider} />

              <Row>
                <Column style={{ width: "33%" }}>
                  <Text style={styles.infoLabel}>{t.status}</Text>
                  <Text style={styles.badge}>
                    {paymentMethod === "cash"
                      ? t.orderStatus.pending
                      : t.orderStatus.confirmed}
                  </Text>
                </Column>
                <Column style={{ width: "33%" }}>
                  <Text style={styles.infoLabel}>{t.delivery}</Text>
                  <Text style={styles.infoValue}>
                    {t.deliveryType[deliveryType]}
                  </Text>
                </Column>
                {paymentMethod && (
                  <Column style={{ width: "33%" }}>
                    <Text style={styles.infoLabel}>{t.payment}</Text>
                    <Text style={styles.infoValue}>
                      {t.paymentMethod[paymentMethod]}
                    </Text>
                  </Column>
                )}
              </Row>
            </Section>

            {/* Order Items */}
            <Section style={styles.section}>
              <Text style={styles.sectionTitle}>{t.itemsReserved}</Text>
              {items.map((item, index) => (
                <Section
                  key={`${item.productId}-${index}`}
                  style={styles.itemCard}
                >
                  <Row>
                    <Column style={{ width: "70%" }}>
                      <Text style={styles.itemName}>{item.productName}</Text>
                      <Text style={styles.itemDetail}>
                        {t.quantity}: {item.quantity}
                      </Text>
                      {item.personalization?.color && (
                        <Text style={styles.itemDetail}>
                          {t.color}: {item.personalization.color}
                        </Text>
                      )}
                      {item.personalization?.text && (
                        <Text style={styles.itemDetail}>
                          {t.text}: "{item.personalization.text}"
                        </Text>
                      )}
                      {item.personalization?.number && (
                        <Text style={styles.itemDetail}>
                          {t.number}: {item.personalization.number}
                        </Text>
                      )}
                    </Column>
                    <Column
                      style={{
                        width: "30%",
                        textAlign: "right",
                        verticalAlign: "top",
                      }}
                    >
                      <Text style={styles.itemPrice}>
                        {formatCurrency(item.price * item.quantity, currency)}
                      </Text>
                    </Column>
                  </Row>
                </Section>
              ))}

              <Row style={{ marginTop: "12px" }}>
                <Column>
                  <Text style={styles.itemDetail}>{t.subtotal}</Text>
                </Column>
                <Column style={{ textAlign: "right" }}>
                  <Text style={styles.itemDetail}>
                    {formatCurrency(subtotal, currency)}
                  </Text>
                </Column>
              </Row>
              {deliveryFee > 0 && (
                <Row>
                  <Column>
                    <Text style={styles.itemDetail}>{t.deliveryFee}</Text>
                  </Column>
                  <Column style={{ textAlign: "right" }}>
                    <Text style={styles.itemDetail}>
                      {formatCurrency(deliveryFee, currency)}
                    </Text>
                  </Column>
                </Row>
              )}
              <Section style={styles.totalRow}>
                <Text style={styles.totalLabel}>{t.totalPaid}</Text>
                <Text style={styles.totalValue}>
                  {formatCurrency(finalTotal, currency)}
                </Text>
              </Section>
            </Section>

            {/* Delivery Address */}
            <Section style={styles.section}>
              <Text style={styles.sectionTitle}>
                {deliveryType === "delivery"
                  ? t.whereWeDeliver
                  : t.pickupAddress}
              </Text>
              <Text style={styles.infoValue}>{customerName}</Text>
              <Text style={{ ...styles.itemDetail, whiteSpace: "pre-line" }}>
                {deliveryType === "delivery"
                  ? formatAddress(shippingAddress)
                  : STORE.address}
              </Text>
            </Section>

            {/* CTA Button */}
            <Section
              style={{
                textAlign: "center",
                marginTop: "20px",
                paddingLeft: "20px",
                paddingRight: "20px",
              }}
            >
              <Link href={confirmationUrl} style={styles.button}>
                {t.viewOnline}
              </Link>
            </Section>
          </Section>

          {/* Footer */}
          <Section style={styles.footer}>
            <Text style={styles.footerText}>
              <strong>{STORE.name}</strong> — {STORE.slogan}
            </Text>
            <Text style={styles.footerText}>{STORE.address}</Text>
            <Text style={styles.footerText}>
              {t.questions}{" "}
              <Link href={`mailto:${STORE.email}`} style={styles.footerLink}>
                {STORE.email}
              </Link>{" "}
              | {STORE.phone}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export default OrderConfirmationEmail;
