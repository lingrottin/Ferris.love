import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Banner({
  children,
  variant = "warning",
}: {
  children?: ReactNode;
  variant?: "warning" | "note";
}) {
  return (
    <div
      className={cn("text-center p-2 border-b border-t font-mono", {
        "text-orange-600 border-orange-700/15 bg-orange-700/10":
          variant === "warning",
        "text-cyan-500 border-cyan-700/15 bg-cyan-700/10": variant === "note",
      })}
    >
      {children}
    </div>
  );
}
