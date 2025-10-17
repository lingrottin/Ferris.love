import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { TopBar } from "@/components/TopBar";

export default async function Dashboard() {
  const user = await auth();
  // if user is not logged in, redirect to login page
  if (!user?.user) {
    return redirect(
      "/?error=true&message=" +
        encodeURIComponent("You must be logged in to access the dashboard."),
    );
  }
  return (
    <>
      <TopBar title={"Dashboard"}>
        <span>logged in as @{user?.user?.id}</span>
      </TopBar>
      <div className="flex flex-col items-center justify-center">
        <div className="pl-5 pr-5 text-center text-5xl/15 font-bold">
          <div className="text-3xl/15 font-bold"></div>
        </div>
      </div>
    </>
  );
}
