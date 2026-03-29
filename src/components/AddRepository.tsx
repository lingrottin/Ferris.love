"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
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
  const [reposState, setReposState] = useState<"loading" | "ready" | "error">(
    "loading",
  );
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

  useEffect(() => {
    let canceled = false;

    (async () => {
      try {
        setReposState("loading");
        const availableRepos = await getAvailableRepos();

        if (canceled) {
          return;
        }

        setRepos(availableRepos.repositories.map((r) => r.full_name));
        setReposState("ready");
      } catch {
        if (canceled) {
          return;
        }

        setRepos([]);
        setReposState("error");
      }
    })();

    return () => {
      canceled = true;
    };
  }, []);

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
      <Dialog>
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
            placeholder="Owner/Repository"
            value={repoInput}
            onChange={(e) => {
              setRepoInput(e.target.value);
              setIsSearching(true);
            }}
          />
          <div
            className={cn(
              "p-2 border-2 rounded-md flex flex-col text-sm overflow-auto gap-1 max-h-[40dvh]",
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
                Seems like you have no repositories or the app is not correctly
                installed. Please go to the{" "}
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
                      "bg-green-100 text-green-600 not-dark:hover:bg-green-100/50 dark:bg-green-900/20 dark:text-green-200 flex flex-row items-center justify-between",
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
            {showSearchEmptyState && (
              <div className="p-2 text-muted-foreground">
                No repositories match your input.
              </div>
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-2 text-justify">
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
