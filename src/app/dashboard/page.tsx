import { getCloudflareContext } from "@opennextjs/cloudflare";
import { Book, ChartArea, Settings } from "lucide-react";
import Image from "next/image";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { Banner } from "@/components/Banner";
import { NavigationItem } from "@/components/NavigationItem";
import { TopBar } from "@/components/TopBar";
import { Button } from "@/components/ui/button";
import { gh } from "@/octokit";
export default async function Dashboard() {
  const { env } = getCloudflareContext();
  const session = await auth();
  // if user is not logged in, redirect to login page
  if (!session?.user) {
    return redirect(
      "/?error=true&message=" +
        encodeURIComponent("You must be logged in to access the dashboard."),
    );
  }
  let installed = true;
  const octo_resp = await gh.octokit
    .request(`/users/${session.user.name}/installation`)
    .catch((_) => {
      installed = false;
      return null;
    });
  if (octo_resp) {
    const octo = await gh.getInstallationOctokit(octo_resp.data.id);
    const resp = await octo.paginate(
      octo.rest.apps.listReposAccessibleToInstallation,
      {
        per_page: 20,
      },
    );
  }

  return (
    <>
      <TopBar title={"Dashboard"}>
        <span>logged in as @{session.user.name}</span>
      </TopBar>
      {!installed && (
        <Banner>
          You need to{" "}
          <a
            className={"underline"}
            href={`https://github.com/apps/${env.GITHUB_APP_NAME}/installations/new`}
          >
            install the app on GitHub
          </a>{" "}
          first before using
        </Banner>
      )}
      <div className="flex flex-col md:ml-15 md:mr-15 lg:ml-50 lg:mr-50 ml-10 mr-10 mt-10 gap-5">
        <div className={"flex flex-row"}>
          <div className={"flex flex-row justify-center items-center flex-1"}>
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
          <div className={"flex-2 items-center justify-end flex"}>
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
        <div className={"flex flex-row"}>
          <div className={"flex-1"}>
            <NavigationItem icon={<Book></Book>} active>
              Repositories
            </NavigationItem>
            <NavigationItem icon={<ChartArea />}>Statistics</NavigationItem>
            <NavigationItem icon={<Settings />}>Settings</NavigationItem>
          </div>
          <div className={"flex-2"}></div>
        </div>
      </div>
    </>
  );
}
