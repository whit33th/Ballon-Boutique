// Ballon Boutique Shop Configuration

/**
 * WhatsApp Configuration
 * Replace with your actual WhatsApp business number
 * Format: country code + phone number without + or spaces
 * Example: "436641234567" for Austrian number +43 664 1234567
 */
export const WHATSAPP_NUMBER = "48572296004";

/**
 * Store Information
 */
export const STORE_INFO = {
  name: "Ballon Boutique",
  slogan: "Wenn Momente zu Emotionen werden",
  sloganRu: "Когда мгновение становится эмоциями",

  address: {
    street: "Sandgasse 3",
    city: "Knittelfeld",
    postalCode: "8720",
    country: "Austria",
    countryCode: "AT",
  },

  contact: {
    email: "service@ballonboutique.at",
    phone: "+43 660 713 90 12",
    phoneDisplay: "+43 660 713 90 12",
  },

  legal: {
    companyName: "Ballon Boutique e.U.",
    owner: "Ekaterina Petrova",
    registrationNumber: "FN 582931 z",
    vatNumber: "ATU78965432",
    competentAuthority: "Bezirkshauptmannschaft Murtal",
    tradeAuthority: "Bezirkshauptmannschaft Murtal - Gewerberecht",
    professionalRegulation: "Gewerbeordnung 1994 (GewO 1994)",
    chamberMembership:
      "Mitglied der Wirtschaftskammer Steiermark (Sparte Handel)",
    supervisoryAuthority: "Bezirkshauptmannschaft Murtal",
    euDisputeResolutionUrl: "https://ec.europa.eu/consumers/odr",
  },

  pickup: {
    schedule: "24/7",
    scheduleRu: "7 дней в неделю, 24 часа в сутки",
    scheduleDe: "7 Tage die Woche, 24 Stunden am Tag",
  },

  delivery: {
    hours: "16:00-21:00",
    cost: 16, // in EUR
    hoursRu: "с 16:00 до 21:00",
    hoursDe: "von 16:00 bis 21:00 Uhr",
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
      label: "Полная онлайн-оплата / Full Online Payment",
      labelRu: "Полная онлайн-оплата",
      labelDe: "Vollständige Online-Zahlung",
      description:
        "Оплатите заказ полностью онлайн — набор будет забронирован сразу после оплаты",
    },
    cash: {
      enabled: true,
      requiresWhatsapp: true,
      onlyForPickup: true,
      label: "Оплата наличными / Cash Payment",
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
  ) => {
    const deliveryText = deliveryType === "pickup" ? "Самовывоз" : "Доставка";
    const dateTime = pickupDateTime || "не указано";
    return `Добрый день! Я хочу подтвердить заказ.\n\nИмя: ${customerName}\nEmail: ${customerEmail}\nАдрес: ${shippingAddress}\nСпособ доставки: ${deliveryText}\nДата и время: ${dateTime}`;
  },

  orderConfirmationDe: (
    customerName: string,
    customerEmail: string,
    shippingAddress: string,
    deliveryType: string,
    pickupDateTime?: string,
  ) => {
    const deliveryText = deliveryType === "pickup" ? "Abholung" : "Lieferung";
    const dateTime = pickupDateTime || "nicht angegeben";
    return `Guten Tag! Ich möchte meine Bestellung bestätigen.\n\nName: ${customerName}\nEmail: ${customerEmail}\nAdresse: ${shippingAddress}\nLieferart: ${deliveryText}\nDatum und Uhrzeit: ${dateTime}`;
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
