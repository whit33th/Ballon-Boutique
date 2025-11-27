// Ballon Boutique Shop Configuration

/**
 * WhatsApp Configuration
 * Replace with your actual WhatsApp business number
 * Format: country code + phone number without + or spaces
 * Example: "436641234567" for Austrian number +43 664 1234567
 */
export const WHATSAPP_NUMBER = "4369020084085";

/**
 * Store Information
 */
export const STORE_INFO = {
  name: "Ballon Boutique",
  slogan: "Wenn Momente zu Emotionen werden",
  sloganRu: "Когда мгновение становится эмоциями",
  sloganEn: "When moments become memories",
  sloganUa: "Коли миті стають спогадами",

  // SEO & Branding
  logo: "/logo.png",
  favicon: "/favicon.ico",
  appleIcon: "/apple-icon.png",
  webAppManifest: "/web-app-manifest-512x512.png",
  backgroundColor: "#ffdfc6",

  // Business Information
  foundingDate: "fix", // "2020-01-01" - дата основания бизнеса
  businessType: "Retail Store",
  industry: "Party Supplies & Decorations",

  // Geographic Information
  geo: {
    latitude: "fix", // "47.2133" - широта
    longitude: "fix", // "14.8306" - долгота
    region: "Styria",
    regionCode: "ST",
    timezone: "Europe/Vienna",
  },

  address: {
    street: "Sandgasse 3/3",
    city: "Knittelfeld",
    postalCode: "8720",
    country: "Austria",
    countryCode: "AT",
    formatted: "Sandgasse 3/3, 8720 Knittelfeld, Austria",
  },

  contact: {
    email: "ballonboutique.at@gmail.com",
    phone: "+43 690 200 84085",
    phoneDisplay: "+43 690 200 84085",
    phoneE164: "+4369020084085",
    whatsapp: "4369020084085",
  },

  // Website
  website: "https://ballon-boutique.vercel.app/",

  // Business Hours
  businessHours: {
    monday: "fix", // "09:00-18:00"
    tuesday: "fix",
    wednesday: "fix",
    thursday: "fix",
    friday: "fix",
    saturday: "fix",
    sunday: "fix",
    timezone: "Europe/Vienna",
  },

  social: {
    instagram: "https://www.instagram.com/ballonboutique.at",
    facebook: "https://www.facebook.com/share/1JrBrLkJ1M/",
    twitter: "fix", // Twitter/X URL если есть
    youtube: "fix", // YouTube URL если есть
    pinterest: "fix", // Pinterest URL если есть
    linkedin: "fix", // LinkedIn URL если есть
    tiktok: "fix", // TikTok URL если есть
  },

  // SEO Keywords
  keywords: {
    primary: [
      "balloons",
      "balloon decorations",
      "party supplies",
      "event decorations",
    ],
    secondary: [
      "birthday balloons",
      "wedding balloons",
      "custom balloons",
      "balloon bouquets",
    ],
    local: ["ballons österreich", "ballons steiermark", "ballons knittelfeld"],
  },

  // Content & Description
  longDescription: {
    de: "fix", // Полное описание бизнеса на немецком
    en: "fix", // Полное описание бизнеса на английском
    ru: "fix", // Полное описание бизнеса на русском
    uk: "fix", // Полное описание бизнеса на украинском
  },

  legal: {
    companyName: "Ballon Boutique",
    owner: "Oleksandra Sidak",
    legalForm:
      "Einzelunternehmerin (Kleinunternehmerin gemäß § 6 Abs. 1 Z 27 UStG)",
    registrationNumber: "fix", // Firmenbuchnummer (falls vorhanden): [Номер oder «не имеется»]
    vatNumber: "fix", // UID-Nummer (ATU…): [Ваш номер oder «нет номера UID»]
    competentAuthority: "Bezirkshauptmannschaft Murtal",
    tradeAuthority: "Bezirkshauptmannschaft Murtal - Gewerberecht",
    professionalRegulation: "Gewerbeordnung 1994 (GewO 1994)",
    chamberMembership: "fix", // Mitglied der Wirtschaftskammer (WKO): [z. B. Wirtschaftskammer Niederösterreich]
    supervisoryAuthority: "Bezirkshauptmannschaft Murtal",
    euDisputeResolutionUrl: "https://ec.europa.eu/consumers/odr",
    companyRegisterCourt: "fix", // Firmenbuchgericht (falls vorhanden): [z. B. Handelsgericht Wien]
    businessLicense: "fix", // Gewerbeberechtigung: [z. B. Handelsgewerbe]
    businessLicenseIssuedBy: "fix", // Ausgestellt von: [Behörde]
    applicableLaw: "www.ris.bka.gv.at",
  },

  pickup: {
    schedule: "24/7",
    scheduleRu: "7 дней в неделю, 24 часа в сутки",
    scheduleDe: "7 Tage die Woche, 24 Stunden am Tag",
  },

  delivery: {
    // Delivery hours when couriers work (source of truth)
    minDeliveryHour: 16, // minimum hour for delivery selection (24-hour format)
    maxDeliveryHour: 21, // maximum hour for delivery selection (24-hour format)
    cost: 16, // in EUR
  },

  orderPolicy: {
    preparationTime: 72, // in hours (3 days)
    cancellationDeadline: 48, // in hours (2 days)
    minPickupDays: 3, // minimum days in advance for pickup
    preparationTimeRu: "72 часа (3 дня)",
    preparationTimeDe: "72 Stunden (3 Tage)",
    cancellationDeadlineRu: "48 часов",
    cancellationDeadlineDe: "48 Stunden",
  },
};

/**
 * Payment Configuration
 */
export const PAYMENT_CONFIG = {
  methods: {
    fullOnline: {
      enabled: true,
      label: "Online Payment",
      labelRu: "Онлайн-оплата",
      labelDe: "Online-Zahlung",
      description:
        "Оплатите заказ полностью онлайн — набор будет забронирован сразу после оплаты",
    },
    cash: {
      enabled: true,
      requiresWhatsapp: true,
      onlyForPickup: true,
      label: "Cash Payment",
      labelRu: "Оплата наличными",
      labelDe: "Barzahlung",
      description:
        "Только при самовывозе. Требуется подтверждение через WhatsApp",
    },
  },
};

/**
 * Primary category cards used across the shop
 */
export { PRIMARY_CATEGORY_CARDS as CATEGORIES } from "./categories";

/**
 * WhatsApp message templates
 */
export const WHATSAPP_MESSAGES = {
  orderConfirmation: (
    customerName: string,
    customerEmail: string,
    shippingAddress: string,
    deliveryType: string,
    pickupDateTime?: string,
    items?: Array<{
      name: string;
      quantity: number;
      personalization?: {
        text?: string;
        color?: string;
        number?: string;
      } | null;
    }> | null,
    total?: number,
  ) => {
    const deliveryText = deliveryType === "pickup" ? "Самовывоз" : "Доставка";
    const dateTime = pickupDateTime || "не указано";

    let itemsText = "";
    if (items?.length) {
      itemsText =
        "\n\nТовары:\n" +
        items
          .map((it) => {
            const parts = [`- ${it.name} x${it.quantity}`];
            if (it.personalization) {
              const p = it.personalization;
              if (p.color) parts.push(`цвет: ${p.color}`);
              if (p.text) parts.push(`текст: "${p.text}"`);
              if (p.number) parts.push(`номер: ${p.number}`);
            }
            return parts.join(", ");
          })
          .join("\n");
    }

    const totalText =
      typeof total === "number" ? `\n\nИтого: ${total} EUR` : "";

    return `Добрый день! Я хочу подтвердить заказ.\n\nИмя: ${customerName}\nEmail: ${customerEmail}\nАдрес: ${shippingAddress}\nСпособ доставки: ${deliveryText}\nДата и время: ${dateTime}${itemsText}${totalText}`;
  },

  orderConfirmationDe: (
    customerName: string,
    customerEmail: string,
    shippingAddress: string,
    deliveryType: string,
    pickupDateTime?: string,
    items?: Array<{
      name: string;
      quantity: number;
      personalization?: {
        text?: string;
        color?: string;
        number?: string;
      } | null;
    }> | null,
    total?: number,
  ) => {
    const deliveryText = deliveryType === "pickup" ? "Abholung" : "Lieferung";
    const dateTime = pickupDateTime || "nicht angegeben";

    let itemsText = "";
    if (items?.length) {
      itemsText =
        "\n\nProdukte:\n" +
        items
          .map((it) => {
            const parts = [`- ${it.name} x${it.quantity}`];
            if (it.personalization) {
              const p = it.personalization;
              if (p.color) parts.push(`Farbe: ${p.color}`);
              if (p.text) parts.push(`Text: "${p.text}"`);
              if (p.number) parts.push(`Nummer: ${p.number}`);
            }
            return parts.join(", ");
          })
          .join("\n");
    }

    const totalText =
      typeof total === "number" ? `\n\nGesamt: ${total} EUR` : "";

    return `Guten Tag! Ich möchte meine Bestellung bestätigen.\n\nName: ${customerName}\nEmail: ${customerEmail}\nAdresse: ${shippingAddress}\nLieferart: ${deliveryText}\nDatum und Uhrzeit: ${dateTime}${itemsText}${totalText}`;
  },
};

/**
 * Helper function to get WhatsApp link
 */
export function getWhatsAppLink(message: string): string {
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`;
}

/**
 * Helper function to format address
 */
export function getFormattedAddress(): string {
  const { street, postalCode, city, country } = STORE_INFO.address;
  return `${street}, ${postalCode} ${city}, ${country}`;
}

/**
 * Get full address with apartment number
 */
export function getFullAddress(): string {
  return `Sandgasse 3/3, ${STORE_INFO.address.postalCode} ${STORE_INFO.address.city}`;
}
