import { getTranslations, setRequestLocale } from "next-intl/server";
import { STORE_INFO } from "@/constants/config";
import { generateLegalMetadata } from "@/SEO";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return generateLegalMetadata(locale, "withdrawal");
}

export default async function WithdrawalPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "legal.withdrawal" });

  const exclusions = t.raw("section3.exclusions") as string[];

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
          <article className="space-y-2">
            <h2 className="text-deep text-base font-semibold tracking-tight">
              {t("section1.title")}
            </h2>
            <p className="whitespace-pre-line">{t("section1.body")}</p>
          </article>

          <article className="space-y-2">
            <h2 className="text-deep text-base font-semibold tracking-tight">
              {t("section2.title")}
            </h2>
            <p className="whitespace-pre-line">{t("section2.body")}</p>
          </article>

          <article className="space-y-2">
            <h2 className="text-deep text-base font-semibold tracking-tight">
              {t("section3.title")}
            </h2>
            <p className="whitespace-pre-line">{t("section3.intro")}</p>
            <ul className="mt-2 list-disc space-y-2 pl-6">
              {exclusions.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
            <p className="mt-2 whitespace-pre-line">{t("section3.damage")}</p>
          </article>

          <article className="space-y-2">
            <h2 className="text-deep text-base font-semibold tracking-tight">
              {t("section4.title")}
            </h2>
            <p className="whitespace-pre-line">{t("section4.body")}</p>
          </article>

          <article className="space-y-2">
            <h2 className="text-deep text-base font-semibold tracking-tight">
              {t("section5.title")}
            </h2>
            <p className="whitespace-pre-line">
              {t("section5.body", {
                email: STORE_INFO.contact.email,
                phone: STORE_INFO.contact.phoneDisplay,
              })}
            </p>
          </article>

          <article className="space-y-2">
            <h2 className="text-deep text-base font-semibold tracking-tight">
              {t("section6.title")}
            </h2>
            <p className="whitespace-pre-line">{t("section6.body")}</p>
          </article>
        </section>
      </div>
    </section>
  );
}
