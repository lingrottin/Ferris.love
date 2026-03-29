"use client";

import { useMemo, useState } from "react";
import { CarTaxiFront, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { COUNTS_LABELS_LONG } from "@/lib/utils";
import { DEFAULT_SHOW } from "@/lib/badge";
import { toast } from "sonner";

interface BadgeCustomizerProps {
  owner: string;
  name: string;
  repo: string;
  lorc?: number | null;
  counts: Record<string, number>;
  base_url: string;
}

export function BadgeCustomizer({
  owner,
  name,
  repo,
  lorc,
  counts,
  base_url,
}: BadgeCustomizerProps) {
  const countEntries = useMemo(() => Object.entries(counts), [counts]);
  const validKeys = useMemo(
    () => new Set(countEntries.map(([key]) => key)),
    [countEntries],
  );

  const [selectedKeys, setSelectedKeys] = useState<string[]>(() => {
    const defaults = DEFAULT_SHOW.filter((key) => validKeys.has(key));
    if (defaults.length > 0) {
      return defaults;
    }
    return countEntries.slice(0, 5).map(([key]) => key);
  });

  const showParam = selectedKeys.join(",");
  const previewSrc = `/badge/${repo}${showParam ? `?show=${encodeURIComponent(showParam)}` : ""}`;
  const htmlSnippet = `<a href="${base_url}/${owner}/${name}"><img src="https://ferris.love/badge/${owner}/${name}${showParam ? `?show=${encodeURIComponent(showParam)}` : ""}" alt="Badge showing this repository's Rust code analysis"></a>`;
  const markdownSnippet = `[![Ferris.love badge](${base_url}/badge/${owner}/${name}${showParam ? `?show=${encodeURIComponent(showParam)}` : ""})](https://ferris.love/${owner}/${name})`;

  async function copyToClipboard(text: string) {
    if (!navigator?.clipboard) {
      return;
    }
    await navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  }

  function toggleKey(key: string, checked: boolean) {
    setSelectedKeys((prev) => {
      if (checked) {
        if (prev.includes(key) || prev.length >= 5) {
          return prev;
        }
        return [...prev, key];
      }
      return prev.filter((k) => k !== key);
    });
  }

  return (
    // 如果在最外层没有 grid 的话 Table 就会溢出来，很奇怪
    // 所以还是保留 grid
    <div className={"grid grid-cols-1"}>
      <div className={"flex flex-col gap-4 pb-10"}>
        <div className={"font-bold text-xl"}>Detailed Analysis</div>

        <ScrollArea className={"max-h-[60dvh] border rounded-lg"}>
          <div>
            <Table className={"p-4"}>
              <TableHeader>
                <TableRow>
                  <TableHead></TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {countEntries.map(([key, value]) => {
                  const isSelected = selectedKeys.includes(key);
                  const disableAdd = !isSelected && selectedKeys.length >= 5;

                  return (
                    <TableRow key={key}>
                      <TableCell>
                        <Checkbox
                          checked={isSelected}
                          disabled={disableAdd}
                          onCheckedChange={(next) =>
                            toggleKey(key, next === true)
                          }
                        ></Checkbox>
                      </TableCell>
                      <TableCell className="font-mono">{key}</TableCell>
                      <TableCell>{COUNTS_LABELS_LONG[key]}</TableCell>
                      <TableCell className="text-right">
                        {value.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={3}>Total lines of Rust code</TableCell>
                  <TableCell className="text-right">
                    {lorc?.toLocaleString() || "N/A"}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </ScrollArea>

        <div className={"flex flex-row justify-end"}>
          <Button
            onClick={() => setSelectedKeys([])}
            disabled={selectedKeys.length === 0}
            variant={"outline"}
          >
            Clear selection
          </Button>
        </div>

        <div className={"font-bold text-xl"} id={"badge-title"}>
          Badge
        </div>

        <div className={"text-sm -mt-2 text-muted-foreground"}>
          Add the badge to your repository's README to show off your Rust code
          stats! It will display the total lines of Rust code, up to 5 items,
          and will be updated every time you push new commits.
        </div>

        <div className={"border border-border rounded-lg p-4"}>
          {/** biome-ignore lint/performance/noImgElement: <Image>'s optimization will mess up badge generation */}
          <img
            src={previewSrc}
            alt="Rust code stats badge"
            className={"w-auto"}
          />
          <div className={"text-sm text-muted-foreground mt-4"}>
            Customize your badge by selecting up to 5 items in the table above.
          </div>
        </div>
        <div className={"text-sm font-bold"}>Use this badge</div>

        <ScrollArea
          className={
            "rounded-lg bg-muted p-4 text-sm mt-2 border-border border relative"
          }
        >
          <code className={"block text-nowrap"}>{htmlSnippet}</code>
          <Button
            className={"absolute top-2 right-2 bg-muted! cursor-pointer"}
            variant={"outline"}
            size={"icon"}
            onClick={() => copyToClipboard(htmlSnippet)}
          >
            <Copy />
          </Button>
          <ScrollBar orientation="horizontal"></ScrollBar>
        </ScrollArea>
        <ScrollArea
          className={
            "rounded-lg bg-muted p-4 text-sm mt-2 border-border border relative"
          }
        >
          <code className={"block text-nowrap"}>{markdownSnippet}</code>
          <Button
            className={"absolute top-2 right-2 bg-muted! cursor-pointer"}
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
  );
}
