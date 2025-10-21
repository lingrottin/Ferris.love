import type { Metadata } from "next";
import "./styles.css";
import LocalFont from "next/font/local";
import NextTopLoader from 'nextjs-toploader';

export const metadata: Metadata = {
  title: "Ferris.love",
  description: "Show how you love Ferris",
};

const _roboto_mono = LocalFont({
  src: "./fonts/Roboto_Mono/RobotoMono-VariableFont_wght.ttf",
  variable: "--font-roboto-mono",
});
const _inter = LocalFont({
  src: [
    {
      path: "./fonts/Inter/Inter-VariableFont_opsz,wght.ttf",
      style: "normal",
    },
    {
      path: "./fonts/Inter/Inter-Italic-VariableFont_opsz,wght.ttf",
      style: "italic",
    },
  ],
  variable: "--font-inter",
});

function TopLoader(){
  "use client";
  return(<NextTopLoader
    showSpinner={false}
    color={"#000000"}
    shadow={false}
  />)
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${_roboto_mono.variable} ${_inter.variable} antialiased`}
    >
      <body>
        <TopLoader/>
        {children}
      </body>
    </html>
  );
}
