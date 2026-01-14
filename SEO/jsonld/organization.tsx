import type {
  ContactPoint,
  PostalAddress,
  Organization as SchemaOrganization,
  WithContext,
} from "schema-dts";
import { STORE_INFO } from "@/constants/config";
import { routing } from "@/i18n/routing";
import { getBaseUrl } from "../utils";

interface OrganizationJsonLdProps {
  locale?: string;
}

export function OrganizationJsonLd({ locale }: OrganizationJsonLdProps = {}) {
  const siteBaseUrl = getBaseUrl();
  const localeForAssets = locale ?? routing.defaultLocale;
  const pageUrl = locale ? `${siteBaseUrl}/${locale}` : siteBaseUrl;

  const address: PostalAddress = {
    "@type": "PostalAddress",
    streetAddress: STORE_INFO.address.street,
    addressLocality: STORE_INFO.address.city,
    postalCode: STORE_INFO.address.postalCode,
    addressCountry: STORE_INFO.address.countryCode,
  };

  const contactPoint: ContactPoint = {
    "@type": "ContactPoint",
    telephone: STORE_INFO.contact.phone,
    contactType: "customer service",
    email: STORE_INFO.contact.email,
    areaServed: "AT",
    availableLanguage: ["de", "en", "ru", "uk"],
  };

  const organizationSchema: WithContext<SchemaOrganization> = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: STORE_INFO.name,
    url: pageUrl,
    logo: `${siteBaseUrl}${STORE_INFO.logo}`,
    image: `${siteBaseUrl}/${localeForAssets}/opengraph-image`,
    description: STORE_INFO.slogan,
    address,
    contactPoint,
    sameAs: [STORE_INFO.social.instagram, STORE_INFO.social.facebook],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
    />
  );
}
