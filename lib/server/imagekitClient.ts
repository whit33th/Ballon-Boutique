import ImageKit from "@imagekit/nodejs";

let cachedClient: ImageKit | null = null;

export function getImageKitServerClient(): ImageKit {
  if (cachedClient) {
    return cachedClient;
  }

  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  const publicKey = process.env.IMAGEKIT_PUBLIC_KEY;
  const urlEndpoint = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT;

  if (!privateKey || !publicKey || !urlEndpoint) {
    throw new Error(
      "ImageKit credentials не настроены. Убедитесь, что IMAGEKIT_PRIVATE_KEY, IMAGEKIT_PUBLIC_KEY и NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT заданы.",
    );
  }

  cachedClient = new ImageKit({
    privateKey,
    publicKey,
    urlEndpoint,
  });

  return cachedClient;
}
