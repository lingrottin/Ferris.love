import { NumberCard } from "@/components/NumberCard";
import { cn } from "@/lib/utils";

export function StatsPage() {
  return (
    <div className={cn("grid grid-cols-1 xl:grid-cols-3 gap-3")}>
      <NumberCard
        title={"Total lines of Rust code"}
        number={"11451"}
      ></NumberCard>
      <NumberCard
        title={"Total variable definitions"}
        number={"4191"}
      ></NumberCard>
      <NumberCard title={"Total function calls"} number={"9810"}></NumberCard>
      <div>WIP</div>
    </div>
  );
}
