import { eq, or } from "drizzle-orm";
import Image from "next/image";
import Link from "next/link";
import { Octokit } from "octokit";
import { getStats } from "@/app/actions/get-stats";
import { Chart } from "@/app/dashboard/[slug]/stats_page";
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
import { users } from "@/db/schema";
import { makeDb } from "@/db/util";

type GithubProfile = {
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string;
  html_url: string;
  bio: string | null;
  followers: number;
  following: number;
  public_repos: number;
};

export default async function PublicUserPage({
  params,
}: {
  params: Promise<{ owner: string }>;
}) {
  const { owner: rawOwner } = await params;
  const owner = decodeURIComponent(rawOwner);

  const db = await makeDb();
  const dbUser = await db
    .select()
    .from(users)
    .where(or(eq(users.login, owner), eq(users.githubId, owner)))
    .then((rows) => rows[0] ?? null);

  if (!dbUser) {
    return (
      <>
        <TopBar title={"User"}></TopBar>
        <UserNotFound owner={owner} />
      </>
    );
  }

  const stats = await getStats(dbUser.githubId);
  const profile = await getGithubProfile(dbUser.login, dbUser.githubId);

  return (
    <>
      <TopBar title={"User"}></TopBar>
      <div className="flex flex-col md:ml-15 md:mr-15 xl:ml-50 xl:mr-50 ml-10 mr-10 mt-10 gap-5">
        <div className={"flex flex-col md:flex-row"}>
          <div
            className={"flex flex-row justify-center items-center md:flex-2"}
          >
            <Image
              className={"w-15 h-15 rounded-full"}
              width={60}
              height={60}
              src={profile.avatar_url}
              alt={`${profile.login}'s profile image`}
            ></Image>
            <div
              className={
                "ml-3 flex flex-col gap-1 justify-center overflow-hidden overflow-ellipsis flex-1 w-0 whitespace-nowrap"
              }
            >
              <div className={"text-lg"}>
                {profile.name && profile.name !== profile.login ? (
                  <>
                    <span className={"font-bold"}>{profile.name}</span>
                    <span className={"font-medium ml-1 text-muted-foreground"}>
                      (@{profile.login})
                    </span>
                  </>
                ) : (
                  <span className={"font-bold"}>@{profile.login}</span>
                )}
              </div>
              {profile.email && (
                <span className={"pb-1 text-sm text-muted-foreground"}>
                  {profile.email}
                </span>
              )}
              {profile.bio && (
                <span className={"pb-1 text-sm text-muted-foreground truncate"}>
                  {profile.bio}
                </span>
              )}
            </div>
          </div>
          <div
            className={
              "md:flex-1 md:items-center md:justify-end flex md:flex-row flex-col gap-2 pt-3 md:pt-0"
            }
          >
            <Button asChild variant="outline" className="w-full md:w-auto">
              <Link href={profile.html_url}>GitHub Profile</Link>
            </Button>
          </div>
        </div>

        <div className={"border-b"}></div>

        <div className={"grid grid-cols-1 xl:grid-cols-4 gap-3"}>
          <NumberCard
            title={"Total lines of Rust code"}
            number={stats.total_lorc.toLocaleString()}
          ></NumberCard>
          <NumberCard
            title={"Total variable definitions"}
            number={stats.total_var_defs.toLocaleString()}
          ></NumberCard>
          <NumberCard
            title={"Total function calls"}
            number={(
              (stats.total_fn_calls ?? 0) + (stats.total_method_calls ?? 0)
            ).toLocaleString()}
          ></NumberCard>
          <NumberCard
            title={"Analyzed repositories"}
            number={stats.total_repos.toLocaleString()}
          ></NumberCard>
        </div>

        <div className={"grid grid-cols-1 xl:grid-cols-2 gap-3"}>
          <Chart
            data={[
              { name: "Method", value: stats.total_method_calls ?? 0 },
              { name: "Function", value: stats.total_fn_calls ?? 0 },
            ]}
            title={"Function Calls by Type"}
          >
            <div className={"text-center"}>
              Of all{" "}
              {(
                (stats.total_fn_calls ?? 0) + (stats.total_method_calls ?? 0)
              ).toLocaleString()}{" "}
              function calls,
              {` ${(
                ((stats.total_method_calls ?? 0) /
                  Math.max(
                    (stats.total_fn_calls ?? 0) +
                      (stats.total_method_calls ?? 0),
                    1,
                  )) *
                  100
              ).toFixed(2)}%`}{" "}
              are called upon a struct instance.
            </div>
          </Chart>

          <Chart
            others
            data={stats.repos.map((repo) => ({
              name: repo.name,
              value: repo.lorc,
            }))}
            title={"Lines of Rust Code by Repository"}
          >
            {(() => {
              const sorted = [...stats.repos].sort((a, b) => b.lorc - a.lorc);
              const pctg =
                ((sorted[0]?.lorc ?? 0) / Math.max(stats.total_lorc, 1)) * 100;
              const repo = sorted[0] ? (
                <Link
                  className={"font-bold hover:underline"}
                  href={`/${sorted[0].owner}/${sorted[0].name}`}
                >
                  {sorted[0].name}
                </Link>
              ) : (
                "N/A"
              );
              return (
                <div className={"text-center"}>
                  Largest repository is {repo} with{" "}
                  {sorted[0]?.lorc.toLocaleString() ?? "N/A"} lines of Rust
                  code, contributing {pctg.toFixed(2)}% of the total.
                </div>
              );
            })()}
          </Chart>

          <Chart
            others
            data={stats.repos.map((repo) => ({
              name: repo.name,
              value: (repo.fn_calls ?? 0) + (repo.method_calls ?? 0),
            }))}
            title={"Function Calls by Repository"}
          >
            {(() => {
              const sorted = [...stats.repos].sort(
                (a, b) =>
                  (b.fn_calls ?? 0) +
                  (b.method_calls ?? 0) -
                  ((a.fn_calls ?? 0) + (a.method_calls ?? 0)),
              );
              const total =
                (sorted[0]?.fn_calls ?? 0) + (sorted[0]?.method_calls ?? 0);
              const pctg =
                (total /
                  Math.max(
                    (stats.total_fn_calls ?? 0) +
                      (stats.total_method_calls ?? 0),
                    1,
                  )) *
                100;
              const repo = sorted[0] ? (
                <Link
                  className={"font-bold hover:underline"}
                  href={`/${sorted[0].owner}/${sorted[0].name}`}
                >
                  {sorted[0].name}
                </Link>
              ) : (
                "N/A"
              );
              return (
                <div className={"text-center"}>
                  Most active repository is {repo} with {total.toLocaleString()}{" "}
                  function calls, contributing {pctg.toFixed(2)}% of the total.
                </div>
              );
            })()}
          </Chart>

          <Chart
            others
            data={stats.repos.map((repo) => ({
              name: repo.name,
              value: repo.var_defs ?? 0,
            }))}
            title={"Variable Definitions by Repository"}
          >
            {(() => {
              const sorted = [...stats.repos].sort(
                (a, b) => (b.var_defs ?? 0) - (a.var_defs ?? 0),
              );
              const pctg =
                ((sorted[0]?.var_defs ?? 0) /
                  Math.max(stats.total_var_defs, 1)) *
                100;
              const repo = sorted[0] ? (
                <Link
                  className={"font-bold hover:underline"}
                  href={`/${sorted[0].owner}/${sorted[0].name}`}
                >
                  {sorted[0].name}
                </Link>
              ) : (
                "N/A"
              );
              return (
                <div className={"text-center"}>
                  Most variable-heavy repository is {repo} with{" "}
                  {sorted[0]?.var_defs.toLocaleString() ?? "N/A"} variable
                  definitions, contributing {pctg.toFixed(2)}% of the total.
                </div>
              );
            })()}
          </Chart>
        </div>
      </div>
    </>
  );
}

async function getGithubProfile(login: string, githubId: string) {
  // Using unauthenticated Octokit: agh() requires a GitHub App installation
  // which may not exist for the viewed user. Unauthenticated rate limit is
  // 60 req/hr — acceptable for public pages with cache headers.
  const octokit = new Octokit();

  try {
    const byLogin = await octokit.request("GET /users/{username}", {
      username: login,
    });
    return byLogin.data as GithubProfile;
  } catch (e: unknown) {
    if (
      e instanceof Error &&
      "status" in e &&
      (e as { status: number }).status === 403
    ) {
      console.warn("GitHub API rate limit exceeded for public user page");
    }
    const numericId = Number(githubId);
    if (!Number.isNaN(numericId)) {
      try {
        const byId = await octokit.request("GET /user/{account_id}", {
          account_id: numericId,
        });
        return byId.data as GithubProfile;
      } catch {}
    }
  }

  const numericId = Number(githubId);
  return {
    login,
    name: null,
    email: null,
    avatar_url: Number.isNaN(numericId)
      ? "https://avatars.githubusercontent.com/u/0?v=4"
      : `https://avatars.githubusercontent.com/u/${numericId}?v=4`,
    html_url: `https://github.com/${login}`,
    bio: null,
    followers: 0,
    following: 0,
    public_repos: 0,
  } satisfies GithubProfile;
}

function UserNotFound({ owner }: { owner: string }) {
  return (
    <div className="flex flex-col md:ml-15 md:mr-15 xl:ml-50 xl:mr-50 ml-10 mr-10 mt-10">
      <Empty className="h-full mt-25">
        <EmptyHeader>
          <EmptyMedia variant="icon">404</EmptyMedia>
          <EmptyTitle>Not Found</EmptyTitle>
          <EmptyDescription className="max-w-xs text-pretty hyphens-auto">
            It seems that Ferris.love does not have information about @{owner}
            yet.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button variant="outline" asChild>
            <Link href={`https://github.com/${owner}`}>Open on GitHub</Link>
          </Button>
        </EmptyContent>
      </Empty>
    </div>
  );
}
