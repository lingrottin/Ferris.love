import { NextResponse } from "next/server";

export async function POST(_request: Request) {
  return new NextResponse(null, { status: 200 });
}
