"use client";

export const Hero = () => {
  return (
    <section className="relative w-full overflow-hidden py-6 sm:py-10 md:py-14">
      {/* <Image
        src={"/imgs/baloonsGif/1.jpg"}
        alt="hero img"
        className="absolute inset-0 -z-10 h-full w-full scale-110 object-cover object-top blur-sm contrast-150"
        fill
        priority
      /> */}

      {/* Content */}
      <div className="mx-auto max-w-3xl px-4 sm:px-8">
        <h1 className="text-2xl leading-tight font-semibold sm:text-3xl md:text-4xl">
          When Moments Become Emotions
        </h1>
        <p className="sm:text-md mt-4 text-sm">
          Designer balloon sets for every celebration
        </p>
      </div>
    </section>
  );
};
