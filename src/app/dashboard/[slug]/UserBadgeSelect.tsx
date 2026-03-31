"use client";

import { ChevronDownIcon, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type UserBadgeVariant = "card" | "mini" | "big_lorc";
export function UserBadgeSelect({
  className,
  userName,
  baseUrl,
}: {
  className?: string;
  userName: string;
  baseUrl: string;
}) {
  const [variant, setVariant] = useState<UserBadgeVariant>("card");

  const htmlSnippet = `<img src="${baseUrl}/badge/${userName}?variant=${variant}" alt="Rust code stats badge" />`;
  const markdownSnippet = `![Rust code stats badge](${baseUrl}/badge/${userName}?variant=${variant})`;

  function copyToClipboard(text: string): void {
    navigator.clipboard
      .writeText(text)
      .then((_) => {
        toast.success("Copied to clipboard.");
      })
      .catch((err) => {
        console.error("Failed to copy to clipboard:", err);
      });
  }
  return (
    <div
      className={cn("border border-border rounded-lg p-6 bg-muted", className)}
    >
      <div className={"font-bold mb-2"}>Badge</div>
      <div className={"w-full text-center"}>
        {/** biome-ignore lint/performance/noImgElement: <Image>'s optimization will mess up badge generation */}
        <img
          src={`${baseUrl}/badge/${userName}?variant=${variant}`}
          alt="Rust code stats badge"
          className={"w-auto inline"}
        />
      </div>
      <div
        className={
          "mt-4 flex flex-col md:flex-row items-start md:items-center md:justify-between not-md:gap-2"
        }
      >
        <div className={"text-sm text-muted-foreground"}>
          This badge represents your Rust contribution status, and can be put
          into your README.
        </div>
        <Select
          value={variant}
          onValueChange={(value) => setVariant(value as UserBadgeVariant)}
        >
          <SelectTrigger className="w-full md:ml-2 md:w-65">
            <SelectValue placeholder="Variant" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="card">Card (Default)</SelectItem>
              <SelectItem value="mini">Mini</SelectItem>
              <SelectItem value="big_lorc">Card with a big LoRC</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
      <Collapsible className={"group"}>
        <CollapsibleTrigger
          className={
            "text-sm font-medium mt-2 group-data-[state=open]:mb-2 w-full flex flex-row justify-between items-center cursor-pointer"
          }
        >
          <div className={"group-data-[state=open]:hidden"}>Show URLs</div>
          <div className={"group-data-[state=closed]:hidden"}>Hide URLs</div>
          <ChevronDownIcon
            size={14}
            className="transition-transform ml-2 group-data-[state=open]:rotate-180 group-data-[state=open]:ml-4"
          />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div>
            <div>
              <div className={"text-xs text-bold"}>HTML</div>
              <ScrollArea
                className={
                  "rounded-lg bg-background p-4 text-sm mt-2 border-border border relative"
                }
              >
                <code className={"block text-nowrap"}>{htmlSnippet}</code>
                <Button
                  className={
                    "absolute top-2 right-2 bg-background! cursor-pointer"
                  }
                  variant={"outline"}
                  size={"icon"}
                  onClick={() => copyToClipboard(htmlSnippet)}
                >
                  <Copy />
                </Button>
                <ScrollBar orientation="horizontal"></ScrollBar>
              </ScrollArea>
            </div>
            <div>
              <div className={"text-xs text-bold"}>Markdown</div>

              <ScrollArea
                className={
                  "rounded-lg bg-background p-4 text-sm mt-2 border-border border relative"
                }
              >
                <code className={"block text-nowrap"}>{markdownSnippet}</code>
                <Button
                  className={
                    "absolute top-2 right-2 bg-background! cursor-pointer"
                  }
                  variant={"outline"}
                  size={"icon"}
                  onClick={() => copyToClipboard(markdownSnippet)}
                >
                  <Copy />
                </Button>
                <ScrollBar orientation="horizontal"></ScrollBar>
              </ScrollArea>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
