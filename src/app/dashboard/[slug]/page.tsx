import { getCloudflareContext } from "@opennextjs/cloudflare";
import { auth, signOut } from "@/auth";
import { redirect } from "next/navigation";
import { getGithubInstallation } from "./util";
import { TopBar } from "@/components/TopBar";
import { Banner } from "@/components/Banner";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { NavigationItem } from "@/components/NavigationItem";
import { Book, ChartArea, Settings } from "lucide-react";
import Link from "next/link";
import {MainPage} from "@/app/dashboard/[slug]/main_page";

export default async function Dashboard() {
    const { env } = await getCloudflareContext({async:true});
    const session = await auth();
    // if user is not logged in, redirect to login page
    if (!session?.user) {
        return redirect(
            "/?error=true&message=" +
            encodeURIComponent("You must be logged in to access the dashboard."),
        );
    }
    const installation = await getGithubInstallation(session.user.name || "");
    const repo=[];

    return (
        <>
            <TopBar title={"Dashboard"}>
                <span>logged in as @{session.user.name}</span>
            </TopBar>
            {installation === null && (
                <Banner>
                    You need to{" "}
                    <Link
                        className={"underline"}
                        href={`https://github.com/apps/${env.GITHUB_APP_NAME}/installations/new`}
                    >
                        install the app on GitHub
                    </Link>{" "}
                    first before using
                </Banner>
            )}
            <div className="flex flex-col md:ml-15 md:mr-15 xl:ml-50 xl:mr-50 ml-10 mr-10 mt-10 gap-5">
                <div className={"flex flex-row"}>
                    <div className={"flex flex-row justify-center items-center flex-2"}>
                        <Image
                            className={"w-15 h-15 rounded-full"}
                            width={15}
                            height={15}
                            src={session.user.image || ""}
                            alt={"Your profile image"}
                        ></Image>
                        <div
                            className={
                                "ml-3 flex flex-col gap-1 justify-center h-20 overflow-hidden overflow-ellipsis flex-1 w-0 whitespace-nowrap"
                            }
                        >
                            <span className={"text-lg font-bold"}>@{session.user.name}</span>
                            <span className={"pb-1"}>{session.user.email}</span>
                        </div>
                    </div>
                    <div className={"flex-1 items-center justify-end flex"}>
                        <form
                            action={async () => {
                                "use server";
                                await signOut();
                            }}
                        >
                            <Button
                                variant="outline"
                                type="submit"
                                className="mt-7 cursor-pointer"
                            >
                                Sign out
                            </Button>
                        </form>
                    </div>
                </div>
                <div className={"border-b-1"}></div>
                <div className={"flex flex-col md:flex-row"}>
                    <div className={"md:flex-1"}>
                        <NavigationItem href={"/dashboard/main"} icon={<Book></Book>} active>
                            Repositories
                        </NavigationItem>
                        <NavigationItem href={"/dashboard/stats"} icon={<ChartArea />}>
                            Statistics
                        </NavigationItem>
                        <NavigationItem href={"/dashboard/settings"} icon={<Settings />}>
                            Settings
                        </NavigationItem>
                    </div>
                    <div
                        className={"border-b-1 mt-3 mb-3 md:mb-0 md:mt-0 md:hidden"}
                    ></div>
                    <div className={"md:flex-2 xl:flex-3 md:pl-5 md:pr-5"}>
                        <MainPage installationId={installation}></MainPage>
                    </div>
                </div>
            </div>
        </>
    );
}
