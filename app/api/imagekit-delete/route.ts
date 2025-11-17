import { type NextRequest, NextResponse } from "next/server";

import { getImageKitServerClient } from "@/lib/server/imagekitClient";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as {
    fileId?: string;
  } | null;
  const fileId = body?.fileId?.trim();

  if (!fileId) {
    return NextResponse.json({ error: "fileId is required" }, { status: 400 });
  }

  try {
    const client = getImageKitServerClient();
    await client.files.deleteFile(fileId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("ImageKit delete error", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to delete previous avatar",
      },
      { status: 500 },
    );
  }
}
