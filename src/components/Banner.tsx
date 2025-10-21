import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Banner(props: {
  children?: ReactNode;
  variant?: "warning" | "note";
}) {
  const variant = props.variant || "warning";
  return (
    <div
      className={cn("text-center p-2 border-b-1 border-t-1 font-mono", {
        "text-orange-600 border-orange-100 bg-orange-50": variant === "warning",
        "text-cyan-500 border-cyan-100 bg-cyan-50": variant === "note",
      })}
    >
      {props.children}
    </div>
  );
}
