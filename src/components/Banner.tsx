import type { ReactNode } from "react";

export function Banner(props: { children?: ReactNode }) {
  return (
    <div className="mt-7 text-orange-600 text-center bg-orange-50 p-2 border-b-1 border-t-1 border-orange-100 font-mono">
      {props.children}
    </div>
  );
}
