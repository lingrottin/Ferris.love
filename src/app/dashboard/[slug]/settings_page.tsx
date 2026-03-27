"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
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
        <div className={"flex flex-col"}>
          <div>{name}</div>
          <div className={"text-sm text-muted-foreground"}>{desc}</div>
        </div>
        <div className={"ml-auto"}>{right}</div>
      </div>
      {down && <div className={"mb-4"}>{down}</div>}
      {!final && <div className={"border-b-1 w-full"}></div>}
    </>
  );
}

function AddRepoForm() {
  const [repo, setRepo] = useState("");
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit() {
    const trimmed = repo.trim();
    if (!trimmed?.includes("/")) {
      setStatus("error");
      setMessage("Please enter a valid owner/repo format.");
      return;
    }

    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch("/api/repos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo: trimmed }),
      });

      const data = (await res.json()) as { status?: string; error?: string };

      if (res.ok) {
        setStatus("success");
        setMessage(`Queued ${trimmed} for analysis!`);
        setRepo("");
      } else {
        setStatus("error");
        setMessage(data.error || "Failed to add repository.");
      }
    } catch {
      setStatus("error");
      setMessage("Network error. Please try again.");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-row gap-2">
        <input
          type="text"
          value={repo}
          onChange={(e) => {
            setRepo(e.target.value);
            setStatus("idle");
          }}
          placeholder="owner/repo"
          className="flex-1 border rounded-md px-3 py-2 text-sm bg-background"
        />
        <Button
          variant="outline"
          onClick={handleSubmit}
          disabled={status === "loading"}
        >
          {status === "loading" ? "Adding..." : "Add"}
        </Button>
      </div>
      {message && (
        <div
          className={cn("text-sm", {
            "text-green-600": status === "success",
            "text-red-600": status === "error",
          })}
        >
          {message}
        </div>
      )}
    </div>
  );
}

export function SettingsPage() {
  return (
    <div className={"flex flex-col"}>
      <Item
        name={"Add repositories"}
        desc={"Add a Rust repository to track with ferris.love"}
        down={<AddRepoForm />}
        first
      />
      <Item
        name={"Trigger recount"}
        desc={
          "Recalculate your contribution stats on all monitored repositories"
        }
        right={<Button variant={"outline"}>Recount</Button>}
      />
      <Item
        name={"Uninstall ferris.love"}
        desc={
          "Uninstall ferris.love from your GitHub account and delete your data held by us"
        }
        right={<Button variant={"destructive"}>Uninstall</Button>}
      />
      <Item
        name={"Sponsor"}
        desc={"Support the development of ferris.love"}
        right={<Button variant={"outline"}>Sponsor</Button>}
        final
      />
    </div>
  );
}
