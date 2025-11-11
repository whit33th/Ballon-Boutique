"use client";
import { motion, useScroll, useTransform } from "motion/react";
import Image from "next/image";
import { useRef } from "react";

const MotionImage = motion(Image);

export default function ParallaxImage() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], ["-10%", "10%"]);
  // чуть больше, чтобы не оставались края

  return (
    <section
      ref={ref}
      className="relative flex aspect-[3/4] items-center justify-center overflow-hidden"
    >
      <MotionImage
        src="/baloons2.png"
        alt="Parallax background"
        style={{ y, scale: 1.1 }}
        fill
        priority
        sizes="100vw"
        className="object-cover will-change-transform"
      />
    </section>
  );
}
