import { getTranslations, setRequestLocale } from "next-intl/server";
import { STORE_INFO } from "@/constants/config";
import { generateLegalMetadata } from "@/SEO";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return generateLegalMetadata(locale, "privacy");
}

export default async function PrivacyPolicyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "legal.privacy" });

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
            <p>{t("section1.intro")}</p>
            <p className="mt-2">
              {t("section1.company", {
                companyName: STORE_INFO.legal.companyName,
              })}
              <br />
              <span className="whitespace-pre-line">
                {t("section1.address")}
              </span>
              <br />
              {t("section1.phone", { phone: STORE_INFO.contact.phoneDisplay })}
              <br />
              {t("section1.email", { email: STORE_INFO.contact.email })}
            </p>
          </div>

          <div>
            <h2 className="text-deep text-base font-semibold tracking-tight">
              {t("section2.title")}
            </h2>
            <p>{t("section2.intro")}</p>
            <ul className="mt-2 list-disc space-y-2 pl-6">
              {(t.raw("section2.dataList") as string[]).map(
                (item: string, index: number) => (
                  <li key={index}>{item}</li>
                ),
              )}
            </ul>
            <p className="mt-2">{t("section2.purposeIntro")}</p>
            <ul className="mt-2 list-disc space-y-2 pl-6">
              {(t.raw("section2.purposeList") as string[]).map(
                (item: string, index: number) => (
                  <li key={index}>{item}</li>
                ),
              )}
            </ul>
          </div>

          <div>
            <h2 className="text-deep text-base font-semibold tracking-tight">
              {t("section3.title")}
            </h2>
            <p>{t("section3.body")}</p>
          </div>

          <div>
            <h2 className="text-deep text-base font-semibold tracking-tight">
              {t("section4.title")}
            </h2>
            <p>{t("section4.body")}</p>
          </div>

          <div>
            <h2 className="text-deep text-base font-semibold tracking-tight">
              {t("section5.title")}
            </h2>
            <p>{t("section5.intro")}</p>
            <ul className="mt-2 list-disc space-y-2 pl-6">
              {(t.raw("section5.thirdPartiesList") as string[]).map(
                (item: string, index: number) => (
                  <li key={index}>{item}</li>
                ),
              )}
            </ul>
            <p className="mt-2">{t("section5.conclusion")}</p>
          </div>

          <div>
            <h2 className="text-deep text-base font-semibold tracking-tight">
              {t("section6.title")}
            </h2>
            <p>{t("section6.body")}</p>
          </div>

          <div>
            <h2 className="text-deep text-base font-semibold tracking-tight">
              {t("section7.title")}
            </h2>
            <p>{t("section7.intro")}</p>
            <ul className="mt-2 list-disc space-y-2 pl-6">
              {(t.raw("section7.rightsList") as string[]).map(
                (item: string, index: number) => (
                  <li key={index}>{item}</li>
                ),
              )}
            </ul>
            {t("section7.outro", { default: "" }) ? (
              <p className="mt-2 whitespace-pre-line">{t("section7.outro")}</p>
            ) : null}
          </div>

          <div>
            <h2 className="text-deep text-base font-semibold tracking-tight">
              {t("section8.title")}
            </h2>
            <p>{t("section8.intro")}</p>
            <p className="mt-2">
              {t("section8.phoneWhatsapp", {
                phone: STORE_INFO.contact.phoneDisplay,
              })}
              <br />
              <a
                href={`mailto:${STORE_INFO.contact.email}`}
                className="hover:text-secondary underline"
              >
                {t("section8.email", { email: STORE_INFO.contact.email })}
              </a>
              {t("section8.outro", { default: "" }) ? (
                <>
                  <br />
                  {t("section8.outro")}
                </>
              ) : null}
            </p>
          </div>
        </section>
      </div>
    </section>
  );
}
