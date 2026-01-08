import { getTranslations, setRequestLocale } from "next-intl/server";
import { STORE_INFO } from "@/constants/config";
import { generateLegalMetadata } from "@/SEO";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return generateLegalMetadata(locale, "imprint");
}

export default async function ImprintPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "legal.imprint" });

  return (
    <section className="bg-primary/20 text-deep min-h-screen px-6 py-12">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-10 rounded-3xl bg-white/95 p-8 shadow-xl">
        <header className="space-y-3">
          <p className="text-xs font-semibold tracking-[0.25em] text-[rgba(var(--deep-rgb),0.6)] uppercase">
            {t("header.subtitle")}
          </p>
          <h1 className="text-deep text-3xl font-semibold tracking-tight">
            {t("header.title")}
          </h1>
        </header>

        <section className="space-y-6 text-sm text-[rgba(var(--deep-rgb),0.8)]">
          <div>
            <h2 className="text-deep text-base font-semibold tracking-tight">
              {t("section1.title")}
            </h2>
            <p>
              {t("section1.value", {
                companyName: STORE_INFO.legal.companyName,
              })}
            </p>
          </div>

          <div>
            <h2 className="text-deep text-base font-semibold tracking-tight">
              {t("section2.title")}
            </h2>
            <p>
              <span className="whitespace-pre-line">
                {t("section2.value", {
                  legalForm: STORE_INFO.legal.legalForm,
                })}
              </span>
            </p>
          </div>

          <div>
            <h2 className="text-deep text-base font-semibold tracking-tight">
              {t("section3.title")}
            </h2>
            <p>
              {t("section3.street", { street: STORE_INFO.address.street })}
              <br />
              {t("section3.city", {
                postalCode: STORE_INFO.address.postalCode,
                city: STORE_INFO.address.city,
              })}
              <br />
              {t("section3.country")}
            </p>
          </div>

          <div>
            <h2 className="text-deep text-base font-semibold tracking-tight">
              {t("section4.title")}
            </h2>
            <p>
              {t("section4.phone", { phone: STORE_INFO.contact.phoneDisplay })}
              <br />
              {t("section4.email", { email: STORE_INFO.contact.email })}
              <br />
              {t("section4.website", { website: "" })}
              <a
                href={STORE_INFO.website}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-secondary underline"
              >
                {STORE_INFO.website}
              </a>
            </p>
          </div>

          <div>
            <h2 className="text-deep text-base font-semibold tracking-tight">
              {t("section5.title")}
            </h2>
            <p>{t("section5.value", { owner: STORE_INFO.legal.owner })}</p>
          </div>

          <div>
            <h2 className="text-deep text-base font-semibold tracking-tight">
              {t("section6.title")}
            </h2>
            <p className="whitespace-pre-line">{t("section6.value")}</p>
          </div>

          <div>
            <h2 className="text-deep text-base font-semibold tracking-tight">
              {t("section7.title")}
            </h2>
            <p className="whitespace-pre-line">{t("section7.value")}</p>
          </div>

          <div>
            <h2 className="text-deep text-base font-semibold tracking-tight">
              {t("section8.title")}
            </h2>
            <p>
              {t("section8.value", { gisaNumber: STORE_INFO.legal.gisaNumber })}
            </p>
          </div>

          <div>
            <h2 className="text-deep text-base font-semibold tracking-tight">
              {t("section9.title")}
            </h2>
            <p>
              <span className="whitespace-pre-line">{t("section9.value")}</span>
            </p>
          </div>

          <div>
            <h2 className="text-deep text-base font-semibold tracking-tight">
              {t("section10.title")}
            </h2>
            <p className="whitespace-pre-line">{t("section10.value")}</p>
          </div>

          <div>
            <h2 className="text-deep text-base font-semibold tracking-tight">
              {t("section11.title")}
            </h2>
            <p className="whitespace-pre-line">{t("section11.law")}</p>
            <p>
              {t("section11.intro")}{" "}
              <a
                href={`https://${STORE_INFO.legal.applicableLaw}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-secondary underline"
              >
                {t("section11.link", {
                  applicableLaw: `https://${STORE_INFO.legal.applicableLaw}`,
                })}
              </a>
            </p>
          </div>

          <div>
            <h2 className="text-deep text-base font-semibold tracking-tight">
              {t("section12.title")}
            </h2>
            <p>{t("section12.paragraph1")}</p>
            <p className="mt-2">{t("section12.paragraph2")}</p>
          </div>

          <div>
            <h2 className="text-deep text-base font-semibold tracking-tight">
              {t("section13.title")}
            </h2>
            <p>{t("section13.paragraph1")}</p>
            <p className="mt-2">{t("section13.paragraph2")}</p>
          </div>
        </section>
      </div>
    </section>
  );
}
