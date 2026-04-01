import { getCloudflareContext } from "@opennextjs/cloudflare";
import { Book, ChartArea, Settings } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Session } from "next-auth";
import { MainPage } from "@/app/dashboard/[slug]/main_page";
import { StatsPage } from "@/app/dashboard/[slug]/stats_page";
import { auth, signOut } from "@/auth";
import { AddRepoForm } from "@/components/AddRepository";
import { Banner } from "@/components/Banner";
import { NavigationItem } from "@/components/NavigationItem";
import { TopBar } from "@/components/TopBar";
import { Button } from "@/components/ui/button";
import { SettingsPage } from "./settings_page";
import { getGithubInstallation } from "./util";

export default async function Dashboard({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [_: string]: string | string[] | undefined }>;
}) {
  const { env } = await getCloudflareContext({ async: true });
  const session = await auth();
  // if user is not logged in, redirect to login page
  if (!session?.user) {
    return redirect(
      "/?error=true&message=" +
        encodeURIComponent("You must be logged in to access the dashboard."),
    );
  }
  let page = 0;
  const { slug } = await params;
  if (slug === "main") {
    const pageParam = (await searchParams).page;
    if (typeof pageParam === "string") page = parseInt(pageParam, 10);
    else if (Array.isArray(pageParam) && pageParam.length > 0) {
      page = parseInt(pageParam[0], 10);
    } else {
      page = 1;
    }
    if (Number.isNaN(page) || page < 1) {
      page = 1;
    }
  }
  // Prefer GitHub login (unique username) if available, otherwise fall back to name
  const user = session.user as Session["user"] & { login?: string };
  const installation = await getGithubInstallation(
    user.db?.login || user.name || "",
  );

  return (
    <>
      <TopBar className={"z-1"} title={"Dashboard"} href={"/dashboard"}>
        {/* <span>logged in as @{user.login || user.name}</span> */}
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
        <div className={"flex flex-col md:flex-row"}>
          <div
            className={"flex flex-row justify-center items-center md:flex-2"}
          >
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
                  if (user.db?.login && user.db?.login !== user.name) {
                    return (
                      <>
                        <span className={"font-bold"}>{user.name}</span>
                        <span
                          className={"font-medium ml-1 text-muted-foreground"}
                        >
                          (@{user.db.login})
                        </span>
                      </>
                    );
                  } else {
                    return (
                      <span className={"font-bold"}>
                        @{user.db?.login || user.name}
                      </span>
                    );
                  }
                })()}
              </div>
              <span className={"pb-1"}>{user.email}</span>
            </div>
          </div>
          <div
            className={
              "md:flex-1 md:items-center md:justify-end flex md:flex-row flex-col gap-2 pt-1 md:pt-0"
            }
          >
            <AddRepoForm btnTitle={"Add Repository"} className={"w-auto"} />
            <form
              className={"shrink w-full md:w-auto"}
              action={async () => {
                "use server";
                await signOut();
              }}
            >
              <Button
                variant="outline"
                type="submit"
                className="cursor-pointer w-full md:w-auto"
              >
                Sign out
              </Button>
            </form>
          </div>
        </div>
        <div className={"border-b"}></div>
        <div className={"flex flex-col md:flex-row"}>
          <div className={"md:flex-1"}>
            <NavigationItem
              href={"/dashboard/main"}
              icon={<Book></Book>}
              active={slug === "main"}
            >
              Repositories
            </NavigationItem>
            <NavigationItem
              href={"/dashboard/stats"}
              icon={<ChartArea />}
              active={slug === "stats"}
            >
              Statistics
            </NavigationItem>
            <NavigationItem
              href={"/dashboard/settings"}
              icon={<Settings />}
              active={slug === "settings"}
            >
              Settings
            </NavigationItem>
          </div>
          <div className={"border-b mt-3 mb-3 md:mb-0 md:mt-0 md:hidden"}></div>
          <div className={"md:flex-2 xl:flex-3 md:ml-5"}>
            {slug === "main" && (
              <MainPage
                page={page}
                installationId={installation}
                session={session}
              ></MainPage>
            )}
            {slug === "stats" && <StatsPage baseUrl={env.BASE_URL}></StatsPage>}
            {slug === "settings" && <SettingsPage></SettingsPage>}
          </div>
        </div>
      </div>
    </>
  );
}
