import { get } from "@vercel/edge-config";
import { NextResponse } from "next/server";

export async function GET() {
  const res = await get("footer_ads");

  return NextResponse.json(res);
}
