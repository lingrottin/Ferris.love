import Link from "next/link";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

function StatusIndicator({
  status,
}: {
  status: "queued" | "analyzing" | "done" | "failed";
}) {
  const colors: Record<string, string> = {
    queued: "bg-yellow-400",
    analyzing: "bg-blue-400 animate-pulse",
    done: "bg-green-500",
    failed: "bg-red-500",
  };
  const labels: Record<string, string> = {
    queued: "Analysis queued",
    analyzing: "Analyzing",
    done: "Up to date",
    failed: "Last analysis failed",
  };
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn("inline-block w-2 h-2 rounded-full", colors[status])}
        />
      </TooltipTrigger>
      <TooltipContent>
        <p>{labels[status]}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export function RepoCard(props: {
  username: string;
  repo: string;
  lorc: number;
  lastUpdated: string;
  status?: "queued" | "analyzing" | "done" | "failed";
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
      {/* <div className="flex items-center justify-between mb-2"> */}
      <div className="text-lg">
        {props.username} / <span className="font-bold">{props.repo}</span>
      </div>
      {/* </div> */}
      <div className="mt-auto">
        <div className="text-sm">
          Total LoRC: <span>{props.lorc}</span>
        </div>
        <div className="flex flex-row items-center justify-between text-sm text-muted-foreground">
          Last updated {props.lastUpdated}
          <StatusIndicator status={props.status || "done"} />
        </div>
      </div>
    </Link>
  );
}
