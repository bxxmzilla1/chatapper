import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { passcode } = await req.json();

  if (passcode === process.env.ADMIN_PASSCODE) {
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid passcode" }, { status: 401 });
}
