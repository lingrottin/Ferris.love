import Link from "next/link";
import type { ReactElement, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function NavigationItem(props: {
  icon: ReactElement;
  href: string;
  className?: string;
  children?: ReactNode;
  active?: boolean;
}) {
  const active = props.active === undefined ? false : props.active;
  return (
    <div
      className={cn(
        "mb-1 flex flex-row items-center grow w-full",
        props.className,
      )}
    >
      <div
        className={cn("mr-1 w-1 h-5", { "rounded-full bg-foreground": active })}
      ></div>
      <div className={"mr-2 text-foreground"}>{props.icon}</div>
      <Link
        href={props.href}
        className={cn(
          "block pl-2 pr-5 pt-2 pb-2 rounded-md w-full transition duration-200 hover:bg-foreground/15",
          {
            "font-medium bg-foreground/10": active,
          },
        )}
      >
        <span>{props.children}</span>
      </Link>
    </div>
  );
}
