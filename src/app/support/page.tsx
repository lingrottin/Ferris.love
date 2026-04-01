import { TopBar } from "@/components/TopBar";
import "../articles.css";
import Script from "next/script";
import Link from "next/link";
export default async function Privacy() {
  return (
    <>
      <TopBar className={""}></TopBar>
      <div className="flex flex-col md:ml-15 md:mr-15 xl:ml-50 xl:mr-50 ml-10 mr-10 mt-10 gap-5">
        <h1 className={"text-3xl font-bold"}>Support</h1>
        <div className={"-mt-2 text-muted-foreground"}>
          Last updated on: April 1, 2026
        </div>
        <div className={"border-b"}></div>
        <div className={"article"}>
          <h2>Getting support</h2>
          <p>
            If you encountered problems, you can contact us by e-mail at{" "}
            <Link href="mailto:support@ferris.love">support@ferris.love</Link>{" "}
            or throught the "Chat with us" button on the bottom-right corner.
            You will be replied within 48 hours.
          </p>
        </div>
      </div>
      {/* @ts-ignore */}
      <Script src="https://fw-cdn.com/16037016/7039039.js" chat="true"></Script>
    </>
  );
}
