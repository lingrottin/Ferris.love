import * as dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import Link from "next/link";
import { getRepo, getRepoStats } from "@/app/dashboard/repo/[repo]/util";
import { NumberCard } from "@/components/NumberCard";
import { TopBar } from "@/components/TopBar";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { makeDb } from "@/db/util";
import { COUNTS_LABELS_LONG, cn } from "@/lib/utils";

dayjs.extend(relativeTime);

export default async function PublicRepoPage({
  params,
}: {
  params: Promise<{ owner: string; repo: string }>;
}) {
  const { owner: rawOwner, repo: rawRepo } = await params;
  const owner = decodeURIComponent(rawOwner);
  const name = decodeURIComponent(rawRepo);
  const repo = `${owner}/${name}`;

  const db = await makeDb();
  const currentRepo = await getRepo(owner, name, db);

  if (!currentRepo) {
    return (
      <>
        <TopBar title={"Repository"}></TopBar>
        <NotFound repo={repo} />
      </>
    );
  }

  const repoStats = await getRepoStats(currentRepo.githubRepoId, db);
  const countEntries = Object.entries(repoStats?.counts ?? {});

  return (
    <>
      <TopBar title={"Repository"}></TopBar>
      <div
        className={
          "flex flex-col md:ml-15 md:mr-15 xl:ml-50 xl:mr-50 ml-10 mr-10 mt-5"
        }
      >
        <div
          className={
            "flex flex-col md:flex-row items-start md:items-center md:justify-between"
          }
        >
          <div>
            <div
              className={
                "flex flex-col md:flex-row items-start md:items-center"
              }
            >
              <h1 className={"text-2xl font-bold"}>{repo}</h1>
              <div
                className={"flex flex-row items-center mt-2 md:mt-0 md:ml-4"}
              >
                <StatusIndicator status={repoStats?.status ?? "error"} />
                {repoStats?.commitSha && (
                  <Link
                    className={
                      "font-mono text-xs rounded-full border bg-muted px-1 ml-2 mr-2 hover:underline"
                    }
                    href={`https://github.com/${repo}/commit/${repoStats.commitSha}`}
                  >
                    {repoStats.commitSha.slice(0, 7)}
                  </Link>
                )}
              </div>
            </div>
            <div className={"text-sm text-muted-foreground mt-2"}>
              {repoStats?.analyzedAt
                ? `Last analyzed ${dayjs.unix(repoStats.analyzedAt).fromNow()} (${dayjs.unix(repoStats.analyzedAt).format("YYYY-MM-DD HH:mm:ss")})`
                : "Never analyzed"}
            </div>
          </div>
          <div
            className={
              "flex mt-2 md:mt-0 flex-col md:flex-row items-center not-md:w-full not-md:border-t not-md:border-border not-md:pt-4 not-md:mt-4 gap-2 md:ml-auto"
            }
          >
            <Button asChild className={"flex-1"} variant="outline">
              <Link href={`https://github.com/${repo}`}>GitHub page</Link>
            </Button>
          </div>
        </div>
        <div className={"border-border border-b mt-4 mb-4"}></div>

        <div className={"flex flex-col gap-4"}>
          <div className={"font-bold text-xl"}>Overview</div>
          <NumberCard
            fixedRow
            title="Lines of Rust code"
            number={repoStats?.lorc.toLocaleString() || "N/A"}
          />
          <NumberCard
            fixedRow
            title="Static function calls"
            number={repoStats?.callFn.toLocaleString() || "N/A"}
          />
          <NumberCard
            fixedRow
            title="Method calls"
            number={repoStats?.callMethod.toLocaleString() || "N/A"}
          />
          <NumberCard
            fixedRow
            title="Variable declarations"
            number={repoStats?.defVar.toLocaleString() || "N/A"}
          />

          <div className={"font-bold text-xl"}>Detailed Analysis</div>
          <ScrollArea className={"max-h-[60dvh] border rounded-lg"}>
            <div>
              <Table className={"p-4"}>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {countEntries.length > 0 ? (
                    countEntries.map(([key, value]) => (
                      <TableRow key={key}>
                        <TableCell className="font-mono">{key}</TableCell>
                        <TableCell>{COUNTS_LABELS_LONG[key] ?? key}</TableCell>
                        <TableCell className="text-right">
                          {value.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={3}
                        className={"text-center text-muted-foreground"}
                      >
                        No detailed analysis data available yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={2}>Total lines of Rust code</TableCell>
                    <TableCell className="text-right">
                      {repoStats?.lorc.toLocaleString() || "N/A"}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          </ScrollArea>
        </div>
      </div>
    </>
  );
}

function StatusIndicator({
  status,
}: {
  status: "queued" | "analyzing" | "done" | "error";
}) {
  const colors: Record<string, string> = {
    queued: "bg-yellow-400",
    analyzing: "bg-blue-400 animate-pulse",
    done: "bg-green-500",
    error: "bg-red-500",
  };
  const labels: Record<string, string> = {
    queued: "Analysis queued",
    analyzing: "Analyzing",
    done: "Up to date",
    error: "Last analysis failed",
  };
  return (
    <div className={"flex flex-row items-center text-sm text-muted-foreground"}>
      <span
        className={cn("inline-block w-3 h-3 rounded-full mr-2", colors[status])}
      />
      <span>{labels[status]}</span>
    </div>
  );
}

function NotFound({ repo }: { repo: string }) {
  return (
    <div
      className={
        "flex flex-col md:ml-15 md:mr-15 xl:ml-50 xl:mr-50 ml-10 mr-10 mt-10"
      }
    >
      <div className={"flex flex-row items-center"}>
        <h1 className={"text-2xl font-bold"}>{repo}</h1>
      </div>
      <div>
        <Empty className="h-full mt-25">
          <EmptyHeader>
            <EmptyMedia variant="icon">404</EmptyMedia>
            <EmptyTitle>Not Found</EmptyTitle>
            <EmptyDescription className="max-w-xs text-pretty hyphens-auto">
              It seems that Ferris.love does not have information about {repo}
              yet.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button variant="outline" asChild>
              <Link href={`https://github.com/${repo}`}>Open on GitHub</Link>
            </Button>
          </EmptyContent>
        </Empty>
      </div>
    </div>
  );
}
