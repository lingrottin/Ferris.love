import { getCloudflareContext } from "@opennextjs/cloudflare";
import { BookX, CircleOff } from "lucide-react";
import Link from "next/link";
import type { Session } from "next-auth";
import { getUserRepos } from "@/app/dashboard/[slug]/util";
import { BadgeEmbed } from "@/components/BadgeEmbed";
import { PaginationIndicator } from "@/components/PaginationIndicator";
import { RepoCard } from "@/components/RepoCard";
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

export async function MainPage({
  installationId,
  page,
  session,
}: {
  installationId: number | null;
  page: number;
  session: Session;
}) {
  const { env } = getCloudflareContext();
  const { reposData, totalCount } = await (async () => {
    if (session.user.db)
      return await getUserRepos(session.user.db.githubId, await makeDb(), page);
    else return { reposData: [], totalCount: 0 };
  })();

  const baseUrl = env.AUTH_URL || "https://ferris.love";
  const page_total = Math.ceil(totalCount / 15);
  return (
    <div
      className={cn({
        "flex flex-col gap-3": reposData.length !== 0,
        "flex flex-col items-center": reposData.length === 0,
      })}
    >
      {installationId === null && (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CircleOff />
            </EmptyMedia>
            <EmptyTitle>Not installed</EmptyTitle>
            <EmptyDescription>
              You'll need to install the app on your GitHub account before you
              can use Ferris.love
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild>
              <Link
                href={`https://github.com/apps/${env.GITHUB_APP_NAME}/installations/new`}
              >
                Install on GitHub
              </Link>
            </Button>
          </EmptyContent>
        </Empty>
      )}
      {installationId !== null && reposData.length === 0 && (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BookX />
            </EmptyMedia>
            <EmptyTitle>No repository added</EmptyTitle>
            <EmptyDescription>
              Go to the settings page to add your Rust repositories and get
              embeddable badges.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild>
              <Link href={"/dashboard/settings"}>Go to Settings Page</Link>
            </Button>
          </EmptyContent>
        </Empty>
      )}
      {reposData.map((r) => {
        const fullName = `${r.ownerLogin}/${r.name}`;
        const badgeUrl = `${baseUrl}/badge/${fullName}`;
        return (
          <div key={r.repoId} className="flex flex-col gap-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <RepoCard
                repo={r.name}
                username={r.ownerLogin}
                lorc={r.lorc}
                lastUpdated={"idk"}
                className="md:col-span-2"
              />
              <BadgeEmbed badgeUrl={badgeUrl} fullName={fullName} />
            </div>
          </div>
        );
      })}
      {reposData.length !== 0 && (
        <div className="flex justify-center mt-3 mb-6">
          <PaginationIndicator page={page} page_total={page_total} />
        </div>
      )}
    </div>
  );
}
