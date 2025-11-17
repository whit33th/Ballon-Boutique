import { getUploadAuthParams } from "@imagekit/next/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
    const publicKey =
      process.env.IMAGEKIT_PUBLIC_KEY ??
      process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY;

    if (!privateKey || !publicKey) {
      return NextResponse.json(
        {
          error:
            "ImageKit ключи не настроены. Проверьте IMAGEKIT_PRIVATE_KEY и IMAGEKIT_PUBLIC_KEY.",
        },
        { status: 500 },
      );
    }

    const authParams = getUploadAuthParams({ privateKey, publicKey });

    return NextResponse.json(
      {
        ...authParams,
        publicKey,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  } catch (error) {
    console.error("ImageKit upload auth error", error);
    return NextResponse.json(
      {
        error:
          "Не удалось подготовить параметры авторизации для загрузки. Попробуйте снова.",
      },
      { status: 500 },
    );
  }
}

