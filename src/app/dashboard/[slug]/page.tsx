import { getCloudflareContext } from "@opennextjs/cloudflare";
import { Book, ChartArea, Settings } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Session } from "next-auth";
import { MainPage } from "@/app/dashboard/[slug]/main_page";
import { auth, signOut } from "@/auth";
import { Banner } from "@/components/Banner";
import { NavigationItem } from "@/components/NavigationItem";
import { TopBar } from "@/components/TopBar";
import { Button } from "@/components/ui/button";
import { getGithubInstallation } from "./util";
import {StatsPage} from "@/app/dashboard/[slug]/stats_page";

export default async function Dashboard({
                                          params,
                                        }: {
  params: Promise<{ slug: string }>
}) {
  const { env } = await getCloudflareContext({ async: true });
  const session = await auth();
  const { slug } = await params;
  // if user is not logged in, redirect to login page
  if (!session?.user) {
    return redirect(
      "/?error=true&message=" +
        encodeURIComponent("You must be logged in to access the dashboard."),
    );
  }
  // Prefer GitHub login (unique username) if available, otherwise fall back to name
  const user = session.user as Session["user"] & { login?: string };
  const installation = await getGithubInstallation(
    user.login || user.name || "",
  );

  return (
    <>
      <TopBar title={"Dashboard"}>
        <span>logged in as @{user.login || user.name}</span>
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
              <div className={"text-lg"}>
                {(() => {
                  if (user.login && user.login !== user.name) {
                    return (
                      <>
                        <span className={"font-bold"}>{user.name}</span>
                        <span className={"font-medium ml-1 text-muted-foreground"}>
                          (@{user.login})
                        </span>
                      </>
                    );
                  } else {
                    return (
                      <span className={"font-bold"}>
                        @{user.login || user.name}
                      </span>
                    );
                  }
                })()}
              </div>
              <span className={"pb-1"}>{user.email}</span>
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
            <NavigationItem
              href={"/dashboard/main"}
              icon={<Book></Book>}
              active={slug==="main"}
            >
              Repositories
            </NavigationItem>
            <NavigationItem href={"/dashboard/stats"} icon={<ChartArea />} active={slug==="stats"}>
              Statistics
            </NavigationItem>
            <NavigationItem href={"/dashboard/settings"} icon={<Settings />} active={slug==="settings"}>
              Settings
            </NavigationItem>
          </div>
          <div
            className={"border-b-1 mt-3 mb-3 md:mb-0 md:mt-0 md:hidden"}
          ></div>
          <div className={"md:flex-2 xl:flex-3 md:pl-5 md:pr-5"}>
            {slug==="main" && <MainPage installationId={installation}></MainPage>}
            {slug==="stats" && <StatsPage></StatsPage>}
          </div>
        </div>
      </div>
    </>
  );
}
