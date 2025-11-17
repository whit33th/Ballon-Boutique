import {
  ImageKitUploadNetworkError,
  type UploadResponse,
  upload,
} from "@imagekit/next";

type UploadAuthResponse = {
  token: string;
  expire: number;
  signature: string;
  publicKey: string;
};

export type ClientUploadProgress = {
  loaded: number;
  total: number;
  percentage: number;
};

type UploadImageKitFileOptions = {
  folder?: string;
  signal?: AbortSignal;
  onProgress?: (progress: ClientUploadProgress) => void;
};

async function fetchUploadAuth(): Promise<UploadAuthResponse> {
  const response = await fetch("/api/imagekit-upload/auth", {
    method: "GET",
    cache: "no-store",
  });

  const payload = (await response.json()) as
    | UploadAuthResponse
    | { error?: string };

  if (!response.ok || !("token" in payload)) {
    const errorMessage =
      (payload && "error" in payload && payload.error) ||
      "Не удалось получить параметры загрузки";
    throw new Error(errorMessage);
  }

  return payload;
}

export async function uploadImageKitFile(
  file: File,
  options?: UploadImageKitFileOptions,
): Promise<UploadResponse> {
  const auth = await fetchUploadAuth();

  try {
    const result = await upload({
      file,
      fileName: file.name,
      folder: options?.folder,
      token: auth.token,
      expire: auth.expire,
      signature: auth.signature,
      publicKey: auth.publicKey,
      useUniqueFileName: true,
      onProgress: (event) => {
        if (!options?.onProgress) {
          return;
        }

        const loaded = event.loaded ?? 0;
        const total = event.total ?? file.size;
        const percentage =
          total > 0 ? Math.min(100, Math.round((loaded / total) * 100)) : 0;

        options.onProgress({
          loaded,
          total,
          percentage,
        });
      },
      abortSignal: options?.signal,
    });

    return result;
  } catch (error) {
    if (error instanceof ImageKitUploadNetworkError) {
      throw error;
    }
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Не удалось загрузить файл в ImageKit");
  }
}

