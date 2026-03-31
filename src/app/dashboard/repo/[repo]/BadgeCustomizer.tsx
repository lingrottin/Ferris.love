"use client";

import { Copy } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DEFAULT_SHOW } from "@/lib/badges";
import { COUNTS_LABELS_LONG } from "@/lib/utils";

interface BadgeCustomizerProps {
  owner: string;
  name: string;
  lorc?: number | null;
  counts: Record<string, number>;
  base_url: string;
}

type RepoBadgeVariant = "horizontal" | "card" | "mini";

export function BadgeCustomizer({
  owner,
  name,
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
  const [variant, setVariant] = useState<RepoBadgeVariant>("horizontal");

  const showParam = selectedKeys.join(",");
  const badgePath = useMemo(() => {
    const searchParams = new URLSearchParams();

    if (showParam) {
      searchParams.set("show", showParam);
    }
    if (variant !== "horizontal") {
      searchParams.set("variant", variant);
    }

    const query = searchParams.toString();
    return `/badge/${owner}/${name}${query ? `?${query}` : ""}`;
  }, [owner, name, showParam, variant]);

  const previewSrc = badgePath;
  const htmlSnippet = `<a href="${base_url}/${owner}/${name}"><img src="${base_url}${badgePath}" alt="Badge showing this repository's Rust code analysis"></a>`;
  const markdownSnippet = `[![Ferris.love badge](${base_url}${badgePath})](${base_url}/${owner}/${name})`;

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

        <div className={"md:flex md:flex-row md:justify-end"}>
          <Button
            className={"not-md:w-full"}
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

        <div className={"border border-border rounded-lg p-4 bg-muted"}>
          <div className={"w-full text-center"}>
            {/** biome-ignore lint/performance/noImgElement: <Image>'s optimization will mess up badge generation */}
            <img
              src={previewSrc}
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
              Customize your badge by selecting up to 5 items in the table
              above. (Mini variant does not show these items thus does not
              support customizations.)
            </div>
            <Select
              value={variant}
              onValueChange={(value) => setVariant(value as RepoBadgeVariant)}
            >
              <SelectTrigger className="w-full md:w-65">
                <SelectValue placeholder="Variant" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="horizontal">
                    Horizontal (default)
                  </SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="mini">Mini</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className={"font-bold"}>Use this badge</div>

        <div className={"text-sm text-muted-foreground -mt-2"}>
          Copy the code below to add the badge to your repository's README.
        </div>

        <div>
          <div className={"text-xs text-bold"}>HTML</div>
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
        </div>
        <div>
          <div className={"text-xs text-bold"}>Markdown</div>

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
    </div>
  );
}

export function UseBadgeButton() {
  "use client";
  return (
    <Button className={"not-md:hidden"} asChild>
      <Link href="#badge-title">Use badge</Link>
    </Button>
  );
}
