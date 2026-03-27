export { auth as middleware } from "@/auth";

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - /badge/* (public SVG badge endpoint)
     * - /api/callback/* (Matthew backend callbacks)
     * - _next/static, _next/image, favicon.ico, public files
     */
    "/((?!badge|api/callback|_next/static|_next/image|favicon\\.ico).*)",
  ],
};
