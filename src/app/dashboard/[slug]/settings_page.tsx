"use client";

import type * as React from "react";
import { useTransition } from "react";
import { toast } from "sonner";
import { recount } from "@/app/actions/recount";
import { AddRepoForm } from "@/components/AddRepository";
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
        name="Uninstall ferris.love"
        desc="Uninstall ferris.love from your GitHub account and delete your data held by us"
        right={<Button variant="destructive">Uninstall</Button>}
      />
      <Item
        name="Sponsor"
        desc="Support the development of ferris.love"
        right={<Button variant="outline">Sponsor</Button>}
        final
      />
    </div>
  );
}
