import Link from "next/link";
import { cn } from "@/lib/utils";

export function RepoCard(props: {
  username: string;
  repo: string;
  lorc: number;
  lastUpdated: string;
  className?: string;
}) {
  return (
    <Link
      href={`/dashboard/repo/${props.username}:${props.repo}`}
      className={cn(
        "flex flex-col rounded-xl border-1 p-5 cursor-pointer transition dark:shadow-accent-foreground/10 dark:hover:bg-foreground/5 hover:shadow-xl overflow-x-hidden",
        props.className,
      )}
    >
      <div className={"text-lg mb-2"}>
        {props.username} / <span className={"font-bold"}>{props.repo}</span>
      </div>
      <div className={"mt-auto"}>
        <div className={"text-sm"}>
          Total LoRC: <span className={""}>{props.lorc}</span>
        </div>
        <div className={"text-sm text-gray-500"}>
          Last updated {props.lastUpdated}
        </div>
      </div>
    </Link>
  );
}
