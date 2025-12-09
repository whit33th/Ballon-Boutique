import { getTranslations } from "next-intl/server";
import Image from "next/image";

export const Hero = async () => {
  const t = await getTranslations("home");

  return (
    <section className="relative w-full px-4 py-12 text-center text-white md:py-16">
      <Image
        src="/imgs/heroBackground.webp"
        alt="Hero Image"
        sizes="100vw"
        fill
        className="absolute inset-0 -z-10 h-full w-full object-cover "
        priority
        fetchPriority="high"
        loading="eager"
      />

      <div className="absolute inset-0 -z-10 bg-linear-to-t from-[#4a0a18]/35 to-[#4a0a18]/15" />
      <div className="absolute left-0 top-0 -z-10 h-full w-26 bg-linear-to-r from-background/15 to-transparent" />
      <div className="absolute right-0 top-0 -z-10 h-full w-26 bg-linear-to-l from-background/15 to-transparent" />

      <h1 className="mb-3 font-serif text-3xl font-normal tracking-tight text-balance [text-shadow:1.5px_1.5px_0_#4a0a18] md:text-4xl lg:text-5xl">
        {t("heroTitle")}
      </h1>
      <p className="mx-auto max-w-2xl text-base leading-relaxed text-pretty text-white/95 [text-shadow:1.5px_1.3px_0_#4a0a18] md:text-lg">
        {t("heroSubtitle")}
      </p>
      {/* <div className="mx-auto flex mt-4 max-w-md items-center justify-center gap-2">
        <div className="via-border h-px flex-1 bg-linear-to-r from-transparent to-transparent" />
        <div className="flex gap-1.5">
          <div className="h-1.5 w-1.5 rounded-full bg-[hsl(25,55%,55%)]" />
          <div className="h-1.5 w-1.5 rounded-full bg-[hsl(25,55%,65%)]" />
          <div className="h-1.5 w-1.5 rounded-full bg-[hsl(25,55%,75%)]" />
        </div>
        <div className="via-border h-px flex-1 bg-linear-to-r from-transparent to-transparent" />
      </div> */}
    </section>
  );
};
