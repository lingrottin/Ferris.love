import type { Metadata } from "next";
import "./styles.css";
import LocalFont from "next/font/local";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/components/ThemeProvider";
import { TopLoader } from "@/components/TopLoader";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

export const metadata: Metadata = {
  title: "Ferris.love",
  description: "Show how you love Ferris",
};

const adwaita_mono = LocalFont({
  src: "./fonts/AdwaitaMono/AdwaitaMono-Regular.ttf",
  weight: "400",
  variable: "--font-adwaita-mono",
});
const inter = LocalFont({
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
  preload: false,
  variable: "--font-inter",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${adwaita_mono.variable} ${inter.variable} antialiased`}
    >
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="icon" type="image/svg+xml" href="/logo.svg"></link>
      </head>
      <body className={"bg-background text-foreground"}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <TooltipProvider>
            <SessionProvider>
              <TopLoader></TopLoader>
              {children}
              <Toaster />
            </SessionProvider>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
