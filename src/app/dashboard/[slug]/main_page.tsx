import { getCloudflareContext } from "@opennextjs/cloudflare";
import { BookX, CircleOff } from "lucide-react";
import Link from "next/link";
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
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { cn } from "@/lib/utils";
import { gh as _gh } from "@/octokit";

function PaginationIndicator({
  page,
  page_total,
}: {
  page: number;
  page_total: number;
}) {
  const maxVisiblePages = 5;
  const startPage = Math.max(1, page - Math.floor(maxVisiblePages / 2));
  const endPage = Math.min(page_total, startPage + maxVisiblePages - 1);
  const pages = Array.from(
    { length: endPage - startPage + 1 },
    (_, i) => startPage + i,
  );

  return (
    <Pagination>
      <PaginationContent>
        {page > 1 && (
          <PaginationItem>
            <PaginationPrevious href={`?page=${page - 1}`} />
          </PaginationItem>
        )}

        {startPage > 1 && (
          <>
            <PaginationItem>
              <PaginationLink href="?page=1">1</PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationEllipsis />
            </PaginationItem>
          </>
        )}

        {pages.map((p) => (
          <PaginationItem key={p}>
            <PaginationLink href={`?page=${p}`} isActive={p === page}>
              {p}
            </PaginationLink>
          </PaginationItem>
        ))}

        {endPage < page_total && (
          <>
            <PaginationItem>
              <PaginationEllipsis />
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href={`?page=${page_total}`}>
                {page_total}
              </PaginationLink>
            </PaginationItem>
          </>
        )}

        {page < page_total && (
          <PaginationItem>
            <PaginationNext href={`?page=${page + 1}`} />
          </PaginationItem>
        )}
      </PaginationContent>
    </Pagination>
  );
}

export async function MainPage({
  installationId,
  page,
}: {
  installationId: number | null;
  page: number;
}) {
  const { env } = getCloudflareContext();
  const repo = [];
  let repo_total = 0;
  if (installationId !== null) {
    const gh = await _gh().getInstallationOctokit(installationId);
    const { data } = await gh.rest.apps.listReposAccessibleToInstallation({
      per_page: 15,
      page: page,
    });
    repo_total = data.total_count;
    repo.push(...(data.repositories || []));
  }
  const page_total = Math.ceil(repo_total / 15);
  return (
    <div
      className={cn({
        "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3":
          repo.length !== 0,
        "flex flex-col items-center": repo.length === 0,
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
      {installationId !== null && repo.length === 0 && (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BookX />
            </EmptyMedia>
            <EmptyTitle>No repository added</EmptyTitle>
            <EmptyDescription>
              You may go to the settings page to add your repositories so that
              we can track your code.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button>Add a repository</Button>
          </EmptyContent>
        </Empty>
      )}
      {repo.map((r) => (
        <RepoCard
          key={r.id}
          repo={r.name}
          username={r.owner.login}
          lorc={1145}
          lastUpdated={"idk"}
        />
      ))}
      {repo.length !== 0 && (
        <div
          className={
            "col-span-1 md:col-span-2 xl:col-span-3 flex justify-center mt-3 mb-6"
          }
        >
          <PaginationIndicator
            page={page}
            page_total={page_total}
          ></PaginationIndicator>
        </div>
      )}
    </div>
  );
}
