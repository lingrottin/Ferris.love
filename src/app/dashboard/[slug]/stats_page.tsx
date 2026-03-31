"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { Pie, PieChart } from "recharts";
import { toast } from "sonner";
import { type GetStatsResult, getStats } from "@/app/actions/get-stats";
import { NumberCard } from "@/components/NumberCard";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { UserBadgeSelect } from "./UserBadgeSelect";

// 从浅到深的橙色，第一个颜色来自最知名的 Ferris 图
const colors = [
  "#F74C00",
  "#CD3F02",
  "#9E3102",
  "#812801",
  "#641F01",
  "#471601",
];

type Item = {
  name: string;
  value: number;
  fill?: string;
};

function groupForPie(items: Item[]) {
  const total = items.reduce((s, x) => s + x.value, 0);
  if (total === 0) return [];

  const sorted = [...items]
    .filter((x) => x.value > 0)
    .sort((a, b) => b.value - a.value);

  const MAX_SLICES = 6; // 包括 "Others" 在内的最大切片数
  const MIN_RATIO = 0.04;

  const kept: Item[] = [];
  const grouped: Item[] = [];

  for (const item of sorted) {
    const ratio = item.value / total;
    if (kept.length < MAX_SLICES && ratio >= MIN_RATIO) {
      kept.push(item);
    } else {
      grouped.push(item);
    }
  }

  const othersValue = grouped.reduce((s, x) => s + x.value, 0);
  return othersValue > 0
    ? [...kept, { name: "Others", value: othersValue }]
    : kept;
}

export function Chart({
  className,
  data,
  others,
  title,
  description,
  children,
}: {
  className?: string;
  data: Item[];
  others?: boolean;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const filteredData = others ? groupForPie(data) : data;
  const config = filteredData.reduce<ChartConfig>((acc, item, index) => {
    const color = colors[index % colors.length];
    filteredData[index].fill = color;
    acc[item.name] = {
      label: item.name,
      color,
    };
    return acc;
  }, {});

  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader className="items-center pb-0">
        <CardTitle>{title || "Pie Chart"}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={config}
          className="mx-auto aspect-square min-h-62.5 [&_.recharts-text]:fill-background"
        >
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
            <Pie
              data={filteredData}
              dataKey="value"
              nameKey="name"
              innerRadius={60}
              strokeWidth={5}
            ></Pie>
            <ChartLegend
              content={<ChartLegendContent nameKey="name" />}
              className="-translate-y-2 flex-wrap gap-2 *:basis-1/4 *:justify-center"
            />
          </PieChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col gap-2 text-sm">{children}</CardFooter>
    </Card>
  );
}

export function StatsPage({ baseUrl }: { baseUrl: string }) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<GetStatsResult | null>(null);
  const session = useSession().data;

  useEffect(() => {
    getStats(session?.user?.id ?? "")
      .then((data) => {
        setStats(data);
      })
      .catch((e) => {
        console.error("Failed to fetch stats:", e);
        toast.error("Failed to load stats. Please try again later.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [session?.user?.id]);

  return (
    <>
      {loading ? (
        <div className={"flex items-center justify-center h-64"}>
          <Spinner className={"size-10"}></Spinner>
        </div>
      ) : (
        <>
          <div className={cn("grid grid-cols-1 xl:grid-cols-3 gap-3")}>
            <NumberCard
              title={"Total lines of Rust code"}
              number={stats ? stats.total_lorc.toLocaleString() : "N/A"}
            ></NumberCard>
            <NumberCard
              title={"Total variable definitions"}
              number={stats ? stats.total_var_defs.toLocaleString() : "N/A"}
            ></NumberCard>
            <NumberCard
              title={"Total function calls"}
              number={
                stats
                  ? (
                      (stats?.total_fn_calls ?? 0) +
                      (stats?.total_method_calls ?? 0)
                    ).toLocaleString()
                  : "N/A"
              }
            ></NumberCard>
            <UserBadgeSelect
              userName={session?.user.login ?? ""}
              baseUrl={baseUrl}
              className={"xl:col-span-3"}
            ></UserBadgeSelect>
          </div>
          <div className={"mt-4 grid grid-cols-1 xl:grid-cols-2 gap-3"}>
            <Chart
              data={[
                { name: "Method", value: stats?.total_method_calls ?? 0 },
                { name: "Function", value: stats?.total_fn_calls ?? 0 },
              ]}
              title={"Function Calls by Type"}
            >
              <div className={"text-center"}>
                Of all{" "}
                {(
                  (stats?.total_fn_calls ?? 0) +
                  (stats?.total_method_calls ?? 0)
                ).toLocaleString() ?? "N/A"}{" "}
                function calls,
                {stats
                  ? ` ${(
                      (stats.total_method_calls /
                        ((stats?.total_fn_calls ?? 0) +
                          (stats?.total_method_calls ?? 0))) *
                        100
                    ).toFixed(2)}%`
                  : " N/A"}{" "}
                are called upon a struct instance.
              </div>
            </Chart>
            <Chart
              others
              data={
                stats?.repos.map((repo) => ({
                  name: repo.name,
                  value: repo.lorc,
                })) ?? []
              }
              title={"Lines of Rust Code by Repository"}
            >
              {(() => {
                const sorted = [...(stats?.repos ?? [])].sort(
                  (a, b) => b.lorc - a.lorc,
                );
                const pctg =
                  ((sorted[0]?.lorc ?? NaN) / (stats?.total_lorc ?? NaN)) * 100;
                const pctg_txt = Number.isNaN(pctg)
                  ? "N/A"
                  : `${pctg.toFixed(2)}%`;
                const repo = sorted[0] ? (
                  <Link
                    className={"font-bold hover:underline"}
                    href={`/dashboard/repo/${sorted[0]?.owner}:${sorted[0]?.name}`}
                  >
                    {sorted[0]?.name}
                  </Link>
                ) : (
                  "N/A"
                );
                return (
                  <div className={"text-center"}>
                    Your largest repository is {repo} with{" "}
                    {sorted[0]?.lorc.toLocaleString() ?? "N/A"} lines of Rust
                    code, contributing {pctg_txt} of your total Rust codebase.
                  </div>
                );
              })()}
            </Chart>
            <Chart
              others
              data={
                stats?.repos.map((repo) => ({
                  name: repo.name,
                  value: (repo.fn_calls ?? 0) + (repo.method_calls ?? 0),
                })) ?? []
              }
              title={"Function Calls by Repository"}
            >
              {(() => {
                const sorted = [...(stats?.repos ?? [])].sort(
                  (a, b) =>
                    (b.fn_calls ?? 0) +
                    (b.method_calls ?? 0) -
                    ((a.fn_calls ?? 0) + (a.method_calls ?? 0)),
                );
                const total =
                  (sorted[0]?.fn_calls ?? 0) + (sorted[0]?.method_calls ?? 0);
                const pctg =
                  (total /
                    ((stats?.total_fn_calls ?? 0) +
                      (stats?.total_method_calls ?? 0))) *
                  100;
                const pctg_txt = Number.isNaN(pctg)
                  ? "N/A"
                  : `${pctg.toFixed(2)}%`;
                const repo = sorted[0] ? (
                  <Link
                    className={"font-bold hover:underline"}
                    href={`/dashboard/repo/${sorted[0]?.owner}:${sorted[0]?.name}`}
                  >
                    {sorted[0]?.name}
                  </Link>
                ) : (
                  "N/A"
                );
                return (
                  <div className={"text-center"}>
                    Your most active repository is {repo} with{" "}
                    {total.toLocaleString() ?? "N/A"} function calls,
                    contributing {pctg_txt} of your total function calls.
                  </div>
                );
              })()}
            </Chart>
            <Chart
              others
              data={
                stats?.repos.map((repo) => ({
                  name: repo.name,
                  value: repo.var_defs ?? 0,
                })) ?? []
              }
              title={"Variable Definitions by Repository"}
            >
              {(() => {
                const sorted = [...(stats?.repos ?? [])].sort(
                  (a, b) => (b.var_defs ?? 0) - (a.var_defs ?? 0),
                );
                const pctg =
                  ((sorted[0]?.var_defs ?? NaN) /
                    (stats?.total_var_defs ?? NaN)) *
                  100;
                const pctg_txt = Number.isNaN(pctg)
                  ? "N/A"
                  : `${pctg.toFixed(2)}%`;
                const repo = sorted[0] ? (
                  <Link
                    href={`/dashboard/repo/${sorted[0]?.owner}:${sorted[0]?.name}`}
                  >
                    {sorted[0]?.name}
                  </Link>
                ) : (
                  "N/A"
                );
                return (
                  <div className={"text-center"}>
                    Your most variable-heavy repository is {repo} with{" "}
                    {sorted[0]?.var_defs.toLocaleString() ?? "N/A"} variable
                    definitions, contributing {pctg_txt} of your total.
                  </div>
                );
              })()}
            </Chart>
          </div>
        </>
      )}
    </>
  );
}
