import { NextResponse } from "next/server";
import LoveFerrisBadge from "@/lib/badges/love-ferris";

export function GET() {
  return new NextResponse(LoveFerrisBadge(), {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
    },
  });
}
