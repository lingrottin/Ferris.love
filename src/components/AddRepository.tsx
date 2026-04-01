"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { toast } from "sonner";
import { addRepository } from "@/app/actions/add-repository";
import { getAvailableRepos } from "@/app/actions/get-available-repos";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";
import { Spinner } from "./ui/spinner";

export function AddRepoForm({
  btnTitle,
  className,
}: {
  btnTitle?: string;
  className?: string;
}) {
  const session = useSession().data;
  const [repoInput, setRepoInput] = useState(
    session?.user.login ? `${session.user.login}/` : "",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [repos, setRepos] = useState<string[]>([]);
  const [reposState, setReposState] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertOwner, setAlertOwner] = useState("");
  const normalizedInput = repoInput.trim().toLowerCase();
  const filteredRepos = isSearching
    ? repos.filter((r) => r.toLowerCase().includes(normalizedInput))
    : repos;
  const showSearchEmptyState =
    reposState === "ready" &&
    repos.length > 0 &&
    isSearching &&
    normalizedInput.length > 0 &&
    filteredRepos.length === 0;

  async function loadRepos() {
    if (reposState === "loading" || reposState === "ready") {
      return;
    }

    try {
      setReposState("loading");
      setIsLoadingMore(false);
      setPage(1);
      setHasMore(false);
      const login = session?.user.login;
      if (!login) {
        setRepos([]);
        setReposState("ready");
        return;
      }
      const availableRepos = await getAvailableRepos(login, 1);
      setRepos(availableRepos.repositories.map((r) => r.full_name));
      setHasMore(availableRepos.has_more);
      setReposState("ready");
    } catch {
      setRepos([]);
      setReposState("error");
    }
  }

  async function loadMoreRepos() {
    if (isLoadingMore || !hasMore || reposState !== "ready") {
      return;
    }

    setIsLoadingMore(true);
    try {
      const nextPage = page + 1;
      const login = session?.user.login;
      if (!login) {
        setHasMore(false);
        return;
      }
      const availableRepos = await getAvailableRepos(login, nextPage);
      setRepos((prev) => {
        const next = new Set(prev);
        for (const repo of availableRepos.repositories) {
          next.add(repo.full_name);
        }
        return Array.from(next);
      });
      setPage(availableRepos.page);
      setHasMore(availableRepos.has_more);
    } catch {
      setHasMore(false);
    } finally {
      setIsLoadingMore(false);
    }
  }

  async function handleSubmit() {
    const repo = repoInput.trim();
    if (!repo?.includes("/")) {
      toast.error(
        'Invalid repository path. Please use the format "owner/repo".',
      );

      return;
    }

    setIsSubmitting(true);

    try {
      const result = await addRepository(repo);
      if (!result.ok) {
        if (result.error === "GitHub App not installed for this owner") {
          setAlertOwner(repo.split("/")[0]);
          setAlertOpen(true);
        }
        toast.error(result.error || "Failed to add repository");
        return;
      }

      toast.success(
        "The repository has been added and is queued for analysis.",
      );
      setRepoInput("");
      setIsSearching(false);
    } catch {
      toast.error("Network error, please try again");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (open) {
            void loadRepos();
          }
        }}
      >
        <DialogTrigger asChild>
          <Button variant={"outline"} className={className}>
            {btnTitle ?? "Select repository"}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select a repository</DialogTitle>
            <DialogDescription>
              Add a repository to be monitored and analyzed by Ferris.love.
            </DialogDescription>
          </DialogHeader>
          <Input
            aria-label="Repository (Owner/Repository format)"
            placeholder="Owner/Repository"
            value={repoInput}
            onChange={(e) => {
              setRepoInput(e.target.value);
              setIsSearching(true);
            }}
          />
          <ScrollArea
            className={cn("p-2 border-2 rounded-md max-h-[40dvh]")}
            viewportProps={{
              onScroll: (event) => {
                const target = event.currentTarget;
                const isAtBottom =
                  target.scrollTop + target.clientHeight >=
                  target.scrollHeight - 24;
                if (isAtBottom) {
                  void loadMoreRepos();
                }
              },
            }}
          >
            <div
              className={cn(
                "flex flex-col gap-1 text-sm",
                reposState === "loading" && "items-center justify-center",
              )}
            >
              {reposState === "loading" && <Spinner></Spinner>}
              {reposState === "error" && (
                <div className="p-2 text-muted-foreground">
                  Failed to load repositories.
                </div>
              )}
              {reposState === "ready" && repos.length === 0 && (
                <div className="p-2 text-muted-foreground">
                  Seems like you have no repositories or the app is not
                  correctly installed. Please go to the{" "}
                  <Link
                    href="https://github.com/settings/installations"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    GitHub settings page
                  </Link>{" "}
                  and make sure you have installed the app on your account.
                </div>
              )}
              {reposState === "ready" &&
                repos.length > 0 &&
                filteredRepos.map((r) => (
                  <button
                    type={"button"}
                    key={r}
                    className={cn(
                      "p-2 rounded-lg cursor-pointer text-start transition-colors hover:bg-secondary",
                      r === repoInput.trim() &&
                        "bg-green-100 text-green-600 not-dark:hover:bg-green-100/50 dark:hover:bg-green-900/30 dark:bg-green-900/20 dark:text-green-200 flex flex-row items-center justify-between",
                    )}
                    onClick={() => {
                      setRepoInput(r);
                      setIsSearching(false);
                    }}
                  >
                    <span>{r}</span>
                    {r === repoInput.trim() && <Check size={16} />}
                  </button>
                ))}
              {reposState === "ready" && hasMore && (
                <div className="flex items-center justify-center p-2">
                  <Spinner></Spinner>
                </div>
              )}
              {showSearchEmptyState && (
                <div className="p-2 text-muted-foreground">
                  No repositories match your input.
                </div>
              )}
            </div>
          </ScrollArea>
          <div className="text-xs text-muted-foreground mt-2 text-pretty text-start md:text-justify hyphens-auto">
            By adding a repository, you acknowledge and agree to share its data
            with Ferris.love for analysis, and to allow Ferris.love to add a
            webhook to your repository. Ferris.love will only read the Rust code
            in your repository using automated tools, and your code will not be
            stored permanently. You can unregister your repositories at any
            time. For more details, please refer to our{" "}
            <Link
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              Privacy Policy
            </Link>
            .
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Close</Button>
            </DialogClose>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting && <Spinner></Spinner>}Add to Ferris.love
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <NotInstalledAlert
        owner_name={alertOwner}
        open={alertOpen}
        setOpen={setAlertOpen}
      ></NotInstalledAlert>
    </>
  );
}

function NotInstalledAlert({
  owner_name,
  open,
  setOpen,
}: {
  owner_name: string;
  open: boolean;
  setOpen: (open: boolean) => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>GitHub App Not Installed</AlertDialogTitle>
          <AlertDialogDescription>
            The Ferris.love GitHub App is not installed for{" "}
            <Link
              className={"underline hover:text-primary"}
              href={`https://github.com/${owner_name}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {owner_name}
            </Link>
            . If {owner_name} is an organization and you are an owner, you may
            install the app at{" "}
            <Link
              className={"underline hover:text-primary"}
              href={`https://github.com/organizations/${owner_name}/settings/installations`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {owner_name}'s GitHub settings page
            </Link>
            .
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>OK</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
