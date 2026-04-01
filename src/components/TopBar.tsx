import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { DarkModeToggle } from "./ui/dark-mode-toggle";
export function TopBar(props: {
  title?: string;
  children?: React.ReactNode;
  className?: string;
  href?: string;
}) {
  return (
    <>
      <div
        className={cn(
          "h-20 flex items-center border-b fixed top-0 left-0 right-0 bg-background",
          props.className,
        )}
      >
        <div className={"flex flex-row items-center ml-7 gap-2"}>
          <Image
            className=""
            alt="Ferris.love logo"
            width="28"
            height="28"
            src="/logo.svg"
          ></Image>{" "}
          <Link
            href={props.href ?? "/"}
            className="block flex-1 text-xl font-mono font-bold hover:underline mt-1"
          >
            {props.title || "Ferris.love"}
          </Link>
        </div>

        <div className="flex-3 mr-7 flex flex-row justify-end items-center">
          {props.children}
          <DarkModeToggle className={"ml-2"}></DarkModeToggle>
        </div>
      </div>
      {/* placeholder to push content down */}
      <div className={"h-20 w-full"}></div>
    </>
  );
}
