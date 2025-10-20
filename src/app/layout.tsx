import type { Metadata } from "next";
import "./styles.css";
import LocalFont from "next/font/local";

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
      <body>{children}</body>
    </html>
  );
}
