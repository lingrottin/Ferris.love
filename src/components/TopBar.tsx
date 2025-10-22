import { cn } from "@/lib/utils";
import { DarkModeToggle } from "./ui/dark-mode-toggle";

export function TopBar(props: {
  title?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <>
      <div
        className={cn(
          "h-20 flex items-center border-b-1 fixed top-0 left-0 right-0 bg-background",
          props.className,
        )}
      >
        <div className="flex-1 ml-7 text-xl font-mono font-bold">
          {props.title || "Ferris.love"}
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
