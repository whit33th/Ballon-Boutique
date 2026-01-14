import { buildSrc } from "@imagekit/next";

const urlEndpoint = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT;

if (!urlEndpoint) {
  console.warn(
    "NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT is not defined. ImageKit assets will not resolve until it is configured.",
  );
}

export const imageKitConfig = {
  urlEndpoint,
};

type PlaceholderFormat =
  | "auto"
  | "webp"
  | "jpg"
  | "jpeg"
  | "png"
  | "gif"
  | "svg"
  | "avif"
  | "orig";

type PlaceholderOptions = {
  width?: number;
  quality?: number;
  blur?: number;
  format?: PlaceholderFormat;
};

export type ImageKitPlaceholderOptions = PlaceholderOptions;

/**
 * Builds a low-quality ImageKit URL suitable for lightweight placeholders.
 */
export const buildPlaceholderUrl = (
  src: string | null | undefined,
  options: PlaceholderOptions = {},
): string | undefined => {
  if (!urlEndpoint || !src) {
    return undefined;
  }

  return buildSrc({
    urlEndpoint,
    src,
    transformation: [
      {
        width: options.width ?? 32,
        quality: options.quality ?? 15,
        blur: options.blur ?? 40,
        format: options.format ?? "webp",
      },
    ],
  });
};

export const DEFAULT_PRODUCT_IMAGE_TRANSFORMATION = [
  { width: 480, quality: 85, format: "auto" as const, progressive: true },
];

export const PRODUCT_DETAIL_IMAGE_TRANSFORMATION = [
  { width: 1024, quality: 85, format: "auto" as const, progressive: false },
];

export const ADMIN_PRODUCT_IMAGE_TRANSFORMATION = [
  { width: 360, quality: 60, format: "auto" as const, progressive: false },
];

export const ADMIN_PREVIEW_IMAGE_TRANSFORMATION = [
  { width: 320, quality: 55, format: "auto" as const, progressive: false },
];
