"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function BadgeEmbed({
  badgeUrl,
  fullName,
}: {
  badgeUrl: string;
  fullName: string;
}) {
  const markdown = `![Ferris.love](${badgeUrl})`;
  const [copied, setCopied] = useState<"url" | "md" | null>(null);

  function copyText(text: string, type: "url" | "md") {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border p-4 text-xs">
      <div className="text-muted-foreground font-medium text-sm mb-1">
        Badge embed
      </div>
      <div className="flex flex-row items-center gap-1">
        <code className="flex-1 truncate bg-muted px-2 py-1 rounded text-[11px]">
          {badgeUrl}
        </code>
        <button
          type="button"
          onClick={() => copyText(badgeUrl, "url")}
          className={cn("p-1 rounded hover:bg-muted cursor-pointer shrink-0")}
          title="Copy badge URL"
        >
          {copied === "url" ? <Check size={14} /> : <Copy size={14} />}
        </button>
      </div>
      <div className="flex flex-row items-center gap-1">
        <code className="flex-1 truncate bg-muted px-2 py-1 rounded text-[11px]">
          {markdown}
        </code>
        <button
          type="button"
          onClick={() => copyText(markdown, "md")}
          className={cn("p-1 rounded hover:bg-muted cursor-pointer shrink-0")}
          title="Copy Markdown"
        >
          {copied === "md" ? <Check size={14} /> : <Copy size={14} />}
        </button>
      </div>
      <a
        href={badgeUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-muted-foreground hover:underline text-[11px]"
      >
        Preview badge for {fullName}
      </a>
    </div>
  );
}
