import { SiGithub } from "@icons-pack/react-simple-icons";
import Image from "next/image";
import { signIn } from "@/auth";
import { TopBar } from "@/components/TopBar";
import { Button } from "@/components/ui/button";
import {Banner} from "@/components/Banner";
import {cn} from "@/lib/utils";

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
      {error && (
          <Banner>
            {decodeURIComponent(message)}
          </Banner>
      )}
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
        <div className="mt-7 h-35 w-80 p-5 bg-orange-50 border-1 border-orange-200 rounded-xl">
          should be the example of the card
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
            <SiGithub size={24} /> Connect with GitHub
          </Button>
        </form>
      </div>
    </>
  );
}
