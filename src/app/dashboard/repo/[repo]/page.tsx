import { getCloudflareContext } from "@opennextjs/cloudflare";
import * as dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { ArrowLeft, X } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Session } from "next-auth";
import { auth } from "@/auth";
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
import { makeDb } from "@/db/util";
import { cn } from "@/lib/utils";
import { BadgeCustomizer, UseBadgeButton } from "./BadgeCustomizer";
import { RemoveRepositoryButton } from "./RemoveRepositoryButton";
import { getRepo, getRepoStats, verifyRepoRelationship } from "./util";

dayjs.extend(relativeTime);

export default async function RepoPage({
  params,
}: {
  params: Promise<{ repo: string }>;
}) {
  const repo = decodeURIComponent((await params).repo).replace(":", "/");
  const [owner, name] = repo.split("/");
  const session = await auth();
  // if user is not logged in, redirect to login page
  if (!session?.user) {
    return redirect(
      "/?error=true&message=" +
        encodeURIComponent("You must be logged in to access the dashboard."),
    );
  }
  const user = session.user as Session["user"] & { login?: string };

  const db = await makeDb();
  const currentRepo = await getRepo(owner, name, db);
  let isRelated = false;
  let repoStats: Awaited<ReturnType<typeof getRepoStats>> | null = null;
  if (currentRepo) {
    isRelated = await verifyRepoRelationship(
      currentRepo.githubRepoId,
      user.db?.githubId || "",
      db,
    );
    repoStats = await getRepoStats(currentRepo.githubRepoId, db);
  }
  const ctx = getCloudflareContext();

  return (
    <>
      <TopBar title={"Repository"} className={"z-114514"}>
        <span className={"text-muted-foreground text-sm"}>
          logged in as{" "}
          <span className={"text-foreground"}>@{user.login || user.name}</span>
        </span>
      </TopBar>
      {isRelated ? (
        <div
          className={
            "flex flex-col md:ml-15 md:mr-15 xl:ml-50 xl:mr-50 ml-10 mr-10 mt-5"
          }
        >
          <Link
            href="/dashboard/main"
            className={
              "flex flex-row items-center text-sm text-muted-foreground mb-4 gap-2"
            }
          >
            <ArrowLeft className={"inline"} size={14} />
            Back
          </Link>
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
                      href={`https://github.com/${repo}/commit/${repoStats?.commitSha}`}
                    >
                      {repoStats?.commitSha.slice(0, 7)}
                    </Link>
                  )}
                </div>
              </div>
              <div className={"text-sm text-muted-foreground mt-2"}>
                {repoStats?.analyzedAt
                  ? `Last analyzed ${dayjs.unix(repoStats?.analyzedAt).fromNow()} (${dayjs.unix(repoStats?.analyzedAt).format("YYYY-MM-DD HH:mm:ss")})`
                  : "Never analyzed"}
              </div>
              {currentRepo && !currentRepo.webhookInstalled && (
                <div className="mt-2 text-sm text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg px-3 py-2">
                  Webhook is not installed for this repository. Stats will not
                  update automatically on push. You can manually trigger a
                  recount from the Settings page.
                </div>
              )}
            </div>
            <div
              className={
                "flex mt-2 md:mt-0 flex-col md:flex-row items-center not-md:w-full not-md:border-t not-md:border-border not-md:pt-4 not-md:mt-4 gap-2 md:ml-auto"
              }
            >
              <div className={"flex gap-2 flex-row not-md:w-full"}>
                <RemoveRepositoryButton repo={repo} />
                <Button asChild className={"flex-1"} variant="outline">
                  <Link href={`https://github.com/${repo}`}>GitHub page</Link>
                </Button>
              </div>

              <UseBadgeButton></UseBadgeButton>
            </div>
          </div>
          <div className={"border-border border-b mt-4 mb-4"}></div>
          <div className={"flex flex-col gap-4"}>
            <div className={"font-bold text-xl"}>Overview</div>

            <NumberCard
              fixedRow
              title="Lines of Rust code"
              number={repoStats?.lorc?.toLocaleString() ?? "N/A"}
            />
            <NumberCard
              fixedRow
              title="Static function calls"
              number={repoStats?.callFn?.toLocaleString() ?? "N/A"}
            />
            <NumberCard
              fixedRow
              title="Method calls"
              number={repoStats?.callMethod?.toLocaleString() ?? "N/A"}
            />
            <NumberCard
              fixedRow
              title="Variable declarations"
              number={repoStats?.defVar?.toLocaleString() ?? "N/A"}
            />
            <BadgeCustomizer
              owner={owner}
              name={name}
              lorc={repoStats?.lorc}
              counts={repoStats?.counts ?? {}}
              base_url={ctx.env.BASE_URL || "https://ferris.love"}
            />
          </div>
        </div>
      ) : (
        <NotRelated repo={repo} />
      )}
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

function NotRelated({ repo }: { repo: string }) {
  return (
    <div
      className={
        "flex flex-col md:ml-15 md:mr-15 xl:ml-50 xl:mr-50 ml-10 mr-10 mt-10"
      }
    >
      <Link
        href="/dashboard/main"
        className={
          "flex flex-row items-center text-sm text-muted-foreground mb-4 gap-2"
        }
      >
        <ArrowLeft className={"inline"} size={14} />
        Back
      </Link>
      <div className={"flex flex-row items-center"}>
        <h1 className={"text-2xl font-bold"}>{repo}</h1>
      </div>
      <div>
        <Empty className="h-full mt-25">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <X />
            </EmptyMedia>
            <EmptyTitle>Not Found</EmptyTitle>
            <EmptyDescription className="max-w-xs text-pretty hyphens-auto">
              It seems that Ferris.love don't have information about {repo}, or
              it is not associated with your account. Please make sure you have
              added the repository to Ferris.love and try again.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button variant="outline" asChild>
              <Link href={"/dashboard/settings"}>Go to Settings page</Link>
            </Button>
          </EmptyContent>
        </Empty>
      </div>
    </div>
  );
}
