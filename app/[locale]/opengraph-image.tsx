import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { STORE_INFO } from "@/constants/config";

export const alt = STORE_INFO.name;
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

function getSloganByLocale(locale: string): string {
  switch (locale) {
    case "en":
      return STORE_INFO.sloganEn;
    case "ru":
      return STORE_INFO.sloganRu;
    case "uk":
      return STORE_INFO.sloganUa;
    default:
      return STORE_INFO.slogan;
  }
}

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const slogan = getSloganByLocale(locale);

  try {
    const logoData = await readFile(
      join(process.cwd(), "public", "android-chrome-512x512.png"),
    );
    const logoSrc = `data:image/png;base64,${logoData.toString("base64")}`;

    return new ImageResponse(
      <div
        style={{
          background:
            "linear-gradient(135deg, #ffdfc6 0%, #ffe2ba 50%, #ffd9b3 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "row",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Decorative background circles */}
        <div
          style={{
            position: "absolute",
            top: "-120px",
            right: "-120px",
            width: "400px",
            height: "400px",
            borderRadius: "50%",
            background: "rgba(255, 182, 193, 0.2)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-80px",
            right: "-100px",
            width: "350px",
            height: "350px",
            borderRadius: "50%",
            background: "rgba(255, 192, 203, 0.15)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "50%",
            right: "15%",
            width: "180px",
            height: "180px",
            borderRadius: "50%",
            background: "rgba(255, 182, 193, 0.18)",
            transform: "translateY(-50%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "20%",
            left: "10%",
            width: "220px",
            height: "220px",
            borderRadius: "50%",
            background: "rgba(255, 192, 203, 0.12)",
          }}
        />

        {/* Left side - Logo */}
        <div
          style={{
            width: "50%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#ffffff",
            position: "relative",
            zIndex: 1,
          }}
        >
          {/* biome-ignore lint/performance/noImgElement: required for next/og ImageResponse */}
          <img
            src={logoSrc}
            alt={STORE_INFO.name}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        </div>

        {/* Right side - Store Info */}
        <div
          style={{
            width: "50%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "60px",
            position: "relative",
            zIndex: 1,
          }}
        >
          {/* Store Name */}
          <div
            style={{
              fontSize: "64px",
              fontWeight: "700",
              color: "#1a1a1a",
              marginBottom: "40px",
              lineHeight: "1.1",
              letterSpacing: "-0.03em",
            }}
          >
            {STORE_INFO.name}
          </div>

          {/* Full Slogan */}
          <div
            style={{
              fontSize: "36px",
              fontWeight: "400",
              color: "#2d2d2d",
              lineHeight: "1.5",
              letterSpacing: "-0.01em",
              maxWidth: "480px",
            }}
          >
            {slogan}
          </div>
        </div>
      </div>,
      {
        ...size,
      },
    );
  } catch {
    return getDefaultImage();
  }
}

function getDefaultImage() {
  return new ImageResponse(
    <div
      style={{
        background: "linear-gradient(135deg, #ffdfc6 0%, #ffe2ba 100%)",
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          fontSize: "64px",
          fontWeight: "bold",
          color: "#1a1a1a",
        }}
      >
        {STORE_INFO.name}
      </div>
    </div>,
    {
      ...size,
    },
  );
}
