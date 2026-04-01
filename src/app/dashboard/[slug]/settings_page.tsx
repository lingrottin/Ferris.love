"use client";

import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import type * as React from "react";
import { useTransition } from "react";
import { toast } from "sonner";
import { recount } from "@/app/actions/recount";
import { unregisterAccount } from "@/app/actions/unregister";
import { AddRepoForm } from "@/components/AddRepository";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

function Item({
  className,
  name,
  desc,
  right,
  down,
  final,
  first,
}: {
  className?: string;
  name?: React.ReactNode;
  desc?: React.ReactNode;
  right?: React.ReactNode;
  down?: React.ReactNode;
  final?: boolean;
  first?: boolean;
}) {
  return (
    <>
      <div
        className={cn(
          "flex flex-row items-center my-4",
          {
            "mt-0": first,
          },
          className,
        )}
      >
        <div className="flex flex-col">
          <div>{name}</div>
          <div className="text-sm text-muted-foreground">{desc}</div>
        </div>
        <div className="ml-auto">{right}</div>
      </div>
      {down && <div className="mb-4">{down}</div>}
      {!final && <div className="border-b w-full" />}
    </>
  );
}

export function SettingsPage() {
  const [isRecounting, startRecount] = useTransition();
  const [isUnregistering, startUnregister] = useTransition();
  const router = useRouter();

  function handleRecount() {
    startRecount(async () => {
      try {
        const result = await recount();
        if (!result.ok) {
          toast.error(result.error || "Failed to trigger recount");
          return;
        }

        if (result.total === 0) {
          toast.info("No monitored repositories found.");
          return;
        }

        if (result.failed === 0) {
          toast.success(`Queued recount for ${result.queued} repositories.`);
          return;
        }

        toast.warning(
          `Queued ${result.queued}/${result.total} repositories. ${result.failed} failed to queue.`,
        );
      } catch {
        toast.error("Network error, please try again");
      }
    });
  }

  function handleUnregister() {
    startUnregister(async () => {
      try {
        const result = await unregisterAccount();
        if (!result.ok) {
          toast.error(result.error || "Failed to unregister account");
          return;
        }

        const message =
          "You may need to uninstall this App completely at https://github.com/settings/installations";
        await signOut({ redirect: false });
        router.push(`/?error=true&message=${encodeURIComponent(message)}`);
      } catch {
        toast.error("Network error, please try again");
      }
    });
  }

  return (
    <div className="flex flex-col">
      <Item
        name="Add repositories"
        desc="Add a Rust repository to be monitored by ferris.love"
        right={<AddRepoForm />}
        first
      />
      <Item
        name="Trigger recount"
        desc="Recalculate your contribution stats on all monitored repositories"
        right={
          <Button
            variant="outline"
            onClick={handleRecount}
            disabled={isRecounting}
          >
            {isRecounting && <Spinner />}
            Recount
          </Button>
        }
      />
      <Item
        name="Unregister your account"
        desc="Remove your account on Ferris.love and delete your data"
        right={
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={isUnregistering}>
                {isUnregistering && <Spinner />}
                Unregister
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Unregister your account?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will remove all your repository links and delete any
                  repositories that no longer have linked users.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isUnregistering}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  onClick={handleUnregister}
                  disabled={isUnregistering}
                >
                  {isUnregistering && <Spinner />}
                  Unregister
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        }
      />
      <Item
        name="Sponsor"
        desc="Support the development of ferris.love"
        right={
          <Button variant="outline" disabled>
            Sponsor
          </Button>
        }
        final
      />
    </div>
  );
}
