"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { removeRepository } from "@/app/actions/remove-repository";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function RemoveRepositoryButton({ repo }: { repo: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isRemoving, startRemoving] = useTransition();

  function onConfirmDelete() {
    startRemoving(async () => {
      const result = await removeRepository(repo);
      if (!result.ok) {
        toast.error(result.error || "Failed to remove repository");
        if (result.removed) {
          setOpen(false);
          router.push("/dashboard/main");
          router.refresh();
        }
        return;
      }

      toast.success("Repository removed.");

      setOpen(false);
      router.push("/dashboard/main");
      router.refresh();
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="icon" disabled={isRemoving}>
              {isRemoving ? <Spinner /> : <Trash2 />}
            </Button>
          </AlertDialogTrigger>
        </TooltipTrigger>
        <TooltipContent>
          <p>Remove this repository</p>
        </TooltipContent>
      </Tooltip>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove repository?</AlertDialogTitle>
          <AlertDialogDescription>
            This will unlink {repo} from your account. You can add it back at
            any time.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isRemoving}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirmDelete} disabled={isRemoving}>
            {isRemoving ? <Spinner /> : null}
            Remove
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
