import { SiGithub } from "@icons-pack/react-simple-icons";
import Image from "next/image";
import { signIn } from "@/auth";
import { Banner } from "@/components/Banner";
import { TopBar } from "@/components/TopBar";
import { Button } from "@/components/ui/button";
import { generateBadge } from "@/lib/badge";
import { cn } from "@/lib/utils";

const exampleBadgeSvg = generateBadge(
  { fn_count: 142, struct_count: 38, enum_count: 12, trait_count: 7 },
  "user/awesome-crate",
);

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
  return (
    <>
      <TopBar className={cn(error && "border-b-0")}></TopBar>
      {error && <Banner>{decodeURIComponent(message)}</Banner>}
      <div className="flex flex-col items-center justify-center">
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
            <span className="text-6xl font-black text-orange-600">Ferris</span>
          </span>
        </div>
        <p className="mt-4 text-muted-foreground text-center max-w-md px-5">
          Embed a live Rust code stats badge in your README. Track functions,
          structs, enums, and traits across your repositories.
        </p>
        <div className="mt-7 p-4 bg-orange-500/5 border border-orange-500/10 rounded-xl">
          {/* biome-ignore lint/security/noDangerouslySetInnerHtml: static SVG */}
          <div dangerouslySetInnerHTML={{ __html: exampleBadgeSvg }} />
        </div>
        <div className="mt-3 text-xs text-muted-foreground font-mono px-5 text-center">
          {"![badge](https://ferris.love/badge/user/awesome-crate)"}
        </div>
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
      </div>
    </>
  );
}
