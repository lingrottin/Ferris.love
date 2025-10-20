import {cn} from "@/lib/utils";
import {Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle} from "@/components/ui/empty";
import {BookX, CircleOff} from "lucide-react";
import {Button} from "@/components/ui/button";
import {getCloudflareContext} from "@opennextjs/cloudflare";
import Link from "next/link";

export function MainPage({installationId}:{installationId:number|null}){
    const {env}=getCloudflareContext();
    const repo=[];
    return (
        <div
        className={cn({
            "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3":
                repo.length !== 0,
            "flex flex-col items-center": repo.length === 0,
        })}
    >
            {installationId===null && <Empty>
                <EmptyHeader>
                    <EmptyMedia variant="icon">
                        <CircleOff />
                    </EmptyMedia>
                    <EmptyTitle>Not installed</EmptyTitle>
                    <EmptyDescription>
                        You'll need to install the app on your GitHub account before you can use Ferris.love                    </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                    <Button asChild><Link
                        href={`https://github.com/apps/${env.GITHUB_APP_NAME}/installations/new`}
                    >Install on GitHub</Link></Button>
                </EmptyContent>
            </Empty>}
            {installationId!==null && (<Empty>
                <EmptyHeader>
                    <EmptyMedia variant="icon">
                        <BookX/>
                    </EmptyMedia>
                    <EmptyTitle>No repository added</EmptyTitle>
                    <EmptyDescription>
                        You may go to the settings page to add your repositories so that we
                        can track your code.
                    </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                    <Button>Add a repository</Button>
                </EmptyContent>
            </Empty>)}
    </div>
    );
}