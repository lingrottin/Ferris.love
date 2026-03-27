import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    login?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    githubId?: string;
    login?: string;
  }
}
