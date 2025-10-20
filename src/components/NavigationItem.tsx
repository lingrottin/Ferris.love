import type { ReactElement, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function NavigationItem(props: {
  icon: ReactElement;
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
      <div className={cn("mr-1 w-1 h-4",
          {"rounded-full bg-amber-300":active})}></div>
      <div className={"mr-2 text-gray-700"}>{props.icon}</div>
      <div
        className={cn("pl-2 pr-5 pt-2 pb-2 rounded-md w-full", {
          "font-bold bg-amber-50": active,
          "cursor-pointer hover:bg-gray-50": !active,
        })}
      >
        <span>{props.children}</span>
      </div>
    </div>
  );
}
