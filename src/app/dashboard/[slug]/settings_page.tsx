"use client";

import type * as React from "react";
import { type FormEvent, useState } from "react";
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
        <div className="flex flex-col">
          <div>{name}</div>
          <div className="text-sm text-muted-foreground">{desc}</div>
        </div>
        <div className="ml-auto">{right}</div>
      </div>
      {down && <div className="mb-4">{down}</div>}
      {!final && <div className="border-b-1 w-full" />}
    </>
  );
}

function AddRepoForm() {
  const [repoInput, setRepoInput] = useState("");
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const repo = repoInput.trim();
    if (!repo?.includes("/")) {
      setStatus("error");
      setMessage("Please enter a valid repo in owner/repo format");
      return;
    }

    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch("/api/repos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo }),
      });
      const data = (await res.json()) as {
        error?: string;
        status?: string;
      };
      if (!res.ok) {
        setStatus("error");
        setMessage(data.error || "Failed to add repository");
        return;
      }
      setStatus("success");
      setMessage(
        data.status === "queued"
          ? "Repository queued for analysis!"
          : "Repository already analyzed — linked to your account.",
      );
      setRepoInput("");
    } catch {
      setStatus("error");
      setMessage("Network error, please try again");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={repoInput}
          onChange={(e) => {
            setRepoInput(e.target.value);
            if (status !== "idle") setStatus("idle");
          }}
          placeholder="owner/repo"
          className="flex-1 rounded-md border px-3 py-1.5 text-sm bg-background"
        />
        <Button
          type="submit"
          variant="outline"
          disabled={status === "loading"}
          className="cursor-pointer"
        >
          {status === "loading" ? "Adding..." : "Add"}
        </Button>
      </div>
      {message && (
        <p
          className={cn(
            "text-sm",
            status === "error" ? "text-red-500" : "text-green-600",
          )}
        >
          {message}
        </p>
      )}
    </form>
  );
}

export function SettingsPage() {
  return (
    <div className="flex flex-col">
      <Item
        name="Add repositories"
        desc="Add a Rust repository to be monitored by ferris.love"
        down={<AddRepoForm />}
        first
      />
      <Item
        name="Trigger recount"
        desc="Recalculate your contribution stats on all monitored repositories"
        right={<Button variant="outline">Recount</Button>}
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
