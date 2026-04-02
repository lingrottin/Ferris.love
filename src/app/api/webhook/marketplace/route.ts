import { NextResponse } from "next/server";

export async function POST(request: Request) {
  return new NextResponse(null, { status: 200 });
}
