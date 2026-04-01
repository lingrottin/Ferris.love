import { SiGithub } from "@icons-pack/react-simple-icons";
import Image from "next/image";
import Link from "next/link";
import { auth, signIn } from "@/auth";
import { BadgeExamples } from "@/components/BadgeExamples";
import { Banner } from "@/components/Banner";
import { TopBar } from "@/components/TopBar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const error = params.error === "true";
  let message = params.message || "";
  if (Array.isArray(message)) {
    message = message.join("");
  }
  const session = await auth();
  return (
    <>
      <TopBar className={cn(error && "border-b-0")}></TopBar>
      {error && <Banner>{decodeURIComponent(message)}</Banner>}
      <div
        className={cn(
          "flex flex-col items-center justify-between",
          error && "min-h-[calc(100dvh-var(--spacing)*24-2rem)]",
          !error && "min-h-[calc(100dvh-var(--spacing)*20)]",
        )}
      >
        <div className={"flex flex-col items-center justify-center"}>
          <div className="pl-5 pr-5 text-center text-5xl/15 font-bold">
            <Image
              className="mb-7 mt-7 inline-block"
              src="https://r2.enita.cn/rustacean-flat-noshadow.svg"
              alt="Ferris the crab"
              width={300}
              height={200}
            />
            <br />
            <span>
              Show how you love <br />
              <span className="text-6xl font-black text-orange-600">
                Ferris
              </span>
            </span>
          </div>
          <BadgeExamples></BadgeExamples>
          {!session?.user ? (
            <form
              action={async () => {
                "use server";
                await signIn("github");
              }}
            >
              <Button
                variant="outline"
                type="submit"
                className="mt-7 cursor-pointer"
              >
                <SiGithub size={24} /> Login with GitHub
              </Button>
            </form>
          ) : (
            <Button asChild variant="outline">
              <Link href="/dashboard">Go to your dashboard</Link>
            </Button>
          )}
        </div>
        <div
          className={
            "mb-8 text-muted-foreground font-mono *:hover:underline *:hover:text-foreground *:transition-colors *:duration-300"
          }
        >
          <Link href="/privacy">Privacy Policy</Link>
          {" | "}
          <Link href="/terms">Terms of Service</Link>
          {" | "}
          <Link href="/credits">Credits</Link>
        </div>
      </div>
    </>
  );
}
