type Locale = "de" | "en" | "ru" | "uk";

interface KeywordsByPage {
  home: Record<Locale, string[]>;
  catalog: Record<Locale, string[]>;
  category: Record<Locale, (category: string) => string[]>;
  product: Record<
    Locale,
    (productName: string, category: string, colors?: string[]) => string[]
  >;
  legal: Record<
    Locale,
    (pageType: "terms" | "privacy" | "imprint" | "cancellation") => string[]
  >;
}

export const SEO_KEYWORDS: KeywordsByPage = {
  home: {
    de: [
      "ballons österreich",
      "ballons steiermark",
      "ballons knittelfeld",
      "ballon dekor",
      "party dekor",
      "geburtstagsballons",
      "hochzeitsballons",
      "event dekor",
      "ballon lieferung",
      "ballon boutique",
      "wenn momente zu emotionen werden",
      "ballons online shop",
      "custom ballons",
      "personalisierte ballons",
      "ballon sets",
      "ballon arrangement",
    ],
    en: [
      "balloons austria",
      "balloons styria",
      "balloons knittelfeld",
      "balloon decorations",
      "party decorations",
      "birthday balloons",
      "wedding balloons",
      "event decorations",
      "balloon delivery",
      "balloon boutique",
      "when moments become memories",
      "balloons online shop",
      "custom balloons",
      "personalized balloons",
      "balloon sets",
      "balloon arrangements",
    ],
    ru: [
      "шары австрия",
      "шары стирия",
      "шары книттельфельд",
      "декор из шаров",
      "декор для вечеринки",
      "шары на день рождения",
      "шары на свадьбу",
      "декор для мероприятий",
      "доставка шаров",
      "ballon boutique",
      "когда мгновения становятся воспоминаниями",
      "интернет магазин шаров",
      "индивидуальные шары",
      "персонализированные шары",
      "наборы шаров",
      "композиции из шаров",
    ],
    uk: [
      "кульки австрія",
      "кульки штирія",
      "кульки кніттельфельд",
      "декор з кульок",
      "декор для вечірки",
      "кульки на день народження",
      "кульки на весілля",
      "декор для заходів",
      "доставка кульок",
      "ballon boutique",
      "коли миті стають спогадами",
      "інтернет магазин кульок",
      "індивідуальні кульки",
      "персоналізовані кульки",
      "набори кульок",
      "композиції з кульок",
    ],
  },

  catalog: {
    de: [
      "ballons katalog",
      "ballons online",
      "ballon shop",
      "ballons kaufen",
      "party dekor shop",
      "event dekor",
      "ballon sets",
      "ballon arrangement",
      "custom ballons",
      "ballons österreich",
    ],
    en: [
      "balloons catalog",
      "balloons online",
      "balloon shop",
      "buy balloons",
      "party decoration shop",
      "event decorations",
      "balloon sets",
      "balloon arrangements",
      "custom balloons",
      "balloons austria",
    ],
    ru: [
      "каталог шаров",
      "шары онлайн",
      "магазин шаров",
      "купить шары",
      "магазин декора",
      "декор для мероприятий",
      "наборы шаров",
      "композиции из шаров",
      "индивидуальные шары",
      "шары австрия",
    ],
    uk: [
      "каталог кульок",
      "кульки онлайн",
      "магазин кульок",
      "купити кульки",
      "магазин декору",
      "декор для заходів",
      "набори кульок",
      "композиції з кульок",
      "індивідуальні кульки",
      "кульки австрія",
    ],
  },

  category: {
    de: (category: string) => [
      category.toLowerCase(),
      "ballons",
      "ballon dekor",
      "party dekor",
      "event dekor",
      "ballons österreich",
      "ballons steiermark",
      "custom ballons",
      "ballon sets",
      "ballon arrangement",
    ],
    en: (category: string) => [
      category.toLowerCase(),
      "balloons",
      "balloon decorations",
      "party decorations",
      "event decorations",
      "balloons austria",
      "balloons styria",
      "custom balloons",
      "balloon sets",
      "balloon arrangements",
    ],
    ru: (category: string) => [
      category.toLowerCase(),
      "шары",
      "декор из шаров",
      "декор для вечеринки",
      "декор для мероприятий",
      "шары австрия",
      "шары стирия",
      "индивидуальные шары",
      "наборы шаров",
      "композиции из шаров",
    ],
    uk: (category: string) => [
      category.toLowerCase(),
      "кульки",
      "декор з кульок",
      "декор для вечірки",
      "декор для заходів",
      "кульки австрія",
      "кульки штирія",
      "індивідуальні кульки",
      "набори кульок",
      "композиції з кульок",
    ],
  },

  product: {
    de: (productName: string, category: string, colors: string[] = []) => [
      productName.toLowerCase(),
      "ballon",
      "ballon dekor",
      category.toLowerCase(),
      ...colors.map((c) => c.toLowerCase()),
      "ballons österreich",
      "custom ballon",
      "personalisierter ballon",
      "ballon set",
      "party dekor",
      "event dekor",
      "ballon boutique",
    ],
    en: (productName: string, category: string, colors: string[] = []) => [
      productName.toLowerCase(),
      "balloon",
      "balloon decoration",
      category.toLowerCase(),
      ...colors.map((c) => c.toLowerCase()),
      "balloons austria",
      "custom balloon",
      "personalized balloon",
      "balloon set",
      "party decoration",
      "event decoration",
      "balloon boutique",
    ],
    ru: (productName: string, category: string, colors: string[] = []) => [
      productName.toLowerCase(),
      "шар",
      "декор из шаров",
      category.toLowerCase(),
      ...colors.map((c) => c.toLowerCase()),
      "шары австрия",
      "индивидуальный шар",
      "персонализированный шар",
      "набор шаров",
      "декор для вечеринки",
      "декор для мероприятий",
      "ballon boutique",
    ],
    uk: (productName: string, category: string, colors: string[] = []) => [
      productName.toLowerCase(),
      "кулька",
      "декор з кульок",
      category.toLowerCase(),
      ...colors.map((c) => c.toLowerCase()),
      "кульки австрія",
      "індивідуальна кулька",
      "персоналізована кулька",
      "набір кульок",
      "декор для вечірки",
      "декор для заходів",
      "ballon boutique",
    ],
  },

  legal: {
    de: (
      pageType: "terms" | "privacy" | "imprint" | "withdrawal" | "cancellation",
    ) => {
      const base = [
        "agb",
        "datenschutz",
        "impressum",
        "widerruf",
        "rechtliches",
        "ballon boutique",
        "ballons österreich",
      ];

      const specific: Record<typeof pageType, string[]> = {
        terms: [
          "allgemeine geschäftsbedingungen",
          "agb",
          "nutzungsbedingungen",
        ],
        privacy: [
          "datenschutzerklärung",
          "dsgvo",
          "datenschutz",
          "privacy policy",
        ],
        imprint: ["impressum", "unternehmensangaben", "firmenangaben"],
        withdrawal: [
          "widerrufsbelehrung",
          "widerrufsrecht",
          "rücktrittsrecht",
          "fagg",
        ],
        cancellation: ["widerrufsrecht", "rückgabe", "stornierung", "widerruf"],
      };

      return [...base, ...specific[pageType]];
    },
    en: (
      pageType: "terms" | "privacy" | "imprint" | "withdrawal" | "cancellation",
    ) => {
      const base = [
        "terms",
        "privacy",
        "imprint",
        "cancellation",
        "legal",
        "balloon boutique",
        "balloons austria",
      ];

      const specific: Record<typeof pageType, string[]> = {
        terms: ["terms and conditions", "terms of service", "user agreement"],
        privacy: [
          "privacy policy",
          "gdpr",
          "data protection",
          "privacy statement",
        ],
        imprint: ["imprint", "company information", "legal notice"],
        withdrawal: [
          "withdrawal policy",
          "right of withdrawal",
          "cancellation rights",
          "returns",
        ],
        cancellation: [
          "cancellation policy",
          "return policy",
          "refund policy",
          "cancellation",
        ],
      };

      return [...base, ...specific[pageType]];
    },
    ru: (
      pageType: "terms" | "privacy" | "imprint" | "withdrawal" | "cancellation",
    ) => {
      const base = [
        "условия",
        "конфиденциальность",
        "импринт",
        "отмена",
        "юридическая информация",
        "ballon boutique",
        "шары австрия",
      ];

      const specific: Record<typeof pageType, string[]> = {
        terms: [
          "условия использования",
          "пользовательское соглашение",
          "условия продажи",
        ],
        privacy: [
          "политика конфиденциальности",
          "gdpr",
          "защита данных",
          "конфиденциальность",
        ],
        imprint: ["импринт", "информация о компании", "юридическая информация"],
        withdrawal: [
          "право отказа",
          "право на возврат",
          "отказ от договора",
          "возврат товара",
        ],
        cancellation: [
          "политика возврата",
          "отмена заказа",
          "возврат средств",
          "отмена",
        ],
      };

      return [...base, ...specific[pageType]];
    },
    uk: (
      pageType: "terms" | "privacy" | "imprint" | "withdrawal" | "cancellation",
    ) => {
      const base = [
        "умови",
        "конфіденційність",
        "імпринт",
        "скасування",
        "юридична інформація",
        "ballon boutique",
        "кульки австрія",
      ];

      const specific: Record<typeof pageType, string[]> = {
        terms: ["умови використання", "користувацька угода", "умови продажу"],
        privacy: [
          "політика конфіденційності",
          "gdpr",
          "захист даних",
          "конфіденційність",
        ],
        imprint: ["імпринт", "інформація про компанію", "юридична інформація"],
        withdrawal: [
          "право відмови",
          "право на повернення",
          "відмова від договору",
          "повернення товару",
        ],
        cancellation: [
          "політика повернення",
          "скасування замовлення",
          "повернення коштів",
          "скасування",
        ],
      };

      return [...base, ...specific[pageType]];
    },
  },
};

/**
 * Get keywords for a specific page and locale
 */
export function getKeywords(
  page: keyof KeywordsByPage,
  locale: Locale,
  ...args: unknown[]
): string[] {
  const keywords = SEO_KEYWORDS[page][locale];

  if (typeof keywords === "function") {
    return (keywords as (...args: unknown[]) => string[])(...args);
  }

  return keywords;
}
