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

export function SettingsPage() {
  return (
    <div className={"flex flex-col"}>
      <Item
        name={"Add repositories"}
        desc={"Add repositories to be monitored by ferris.love"}
        right={<Button variant={"outline"}>Select</Button>}
        down={
          <div className={"text-sm text-muted-foreground mt-2"}>
            You can add or remove repositories at any time
          </div>
        }
        first
      ></Item>
      <Item
        name={"Trigger recount"}
        desc={
          "Recalculate your contribution stats on all monitored repositories"
        }
        right={<Button variant={"outline"}>Recount</Button>}
      ></Item>
      <Item
        name={"Lorem ipsum"}
        desc={
          "Consectetur adipiscing elit. Maecenas maximus nulla a risus interdum hendrerit"
        }
        right={<Button variant={"outline"}>Praesent</Button>}
      ></Item>
      <Item
        name={"Lorem ipsum"}
        desc={
          "Consectetur adipiscing elit. Maecenas maximus nulla a risus interdum hendrerit"
        }
        right={<Button variant={"outline"}>Praesent</Button>}
      ></Item>
      <Item
        name={"Uninstall ferris.love"}
        desc={
          "Uninstall ferris.love from your GitHub account and delete your data held by us"
        }
        right={<Button variant={"destructive"}>Uninstall</Button>}
      ></Item>
      <Item
        name={"Sponsor"}
        desc={"Support the development of ferris.love"}
        right={<Button variant={"outline"}>Sponsor</Button>}
        final
      ></Item>
    </div>
  );
}
