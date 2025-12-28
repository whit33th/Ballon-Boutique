import { NextResponse } from "next/server";

export async function POST(request: Request) {
  void request;
  return NextResponse.json(
    {
      error:
        "Email sending is disabled in this project (send-order-email endpoint removed).",
    },
    { status: 410 },
  );
}
