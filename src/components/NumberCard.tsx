import { cn } from "@/lib/utils";

export function NumberCard({
  className,
  title,
  number,
}: {
  className?: string;
  title: string;
  number: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-row items-center xl:items-start xl:flex-col border-1 rounded-2xl p-5",
        className,
      )}
    >
      <div className={"text-muted-foreground xl:mb-1 mr-auto"}>{title}</div>
      <div className={"xl:mt-auto text-3xl font-bold"}>{number}</div>
    </div>
  );
}
