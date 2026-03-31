import NextAuth from "next-auth";
import authConfig from "@/auth.config";

const { auth } = NextAuth(authConfig);
export default auth;

export const config = {
  matcher: [
    "/((?!badge|api/callback|api/webhook|_next/static|_next/image|favicon\\.ico).*)",
  ],
};
