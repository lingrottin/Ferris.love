"use client";
import { useTheme } from "next-themes";
import NextTopLoader from "nextjs-toploader";
import { useEffect, useState } from "react";

export function TopLoader() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }
  const color = resolvedTheme === "dark" ? "#ffffff" : "#000000";
  return <NextTopLoader showSpinner={false} color={color} shadow={false} />;
}
