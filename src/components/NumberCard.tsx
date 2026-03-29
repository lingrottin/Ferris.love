import { cn } from "@/lib/utils";

export function NumberCard({
  className,
  title,
  number,
  fixedRow,
}: {
  className?: string;
  title: string;
  number: string;
  fixedRow?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-row items-center border rounded-2xl p-5",
        !fixedRow && "xl:items-start xl:flex-col",
        className,
      )}
    >
      <div className={"text-muted-foreground xl:mb-1 mr-auto"}>{title}</div>
      <div className={"xl:mt-auto text-3xl font-bold"}>{number}</div>
    </div>
  );
}
