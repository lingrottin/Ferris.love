import { redirect } from "next/navigation";

export default async function FallbackPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolved = await searchParams;

  // 展平数组、过滤 undefined
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(resolved)) {
    if (typeof value === "string") {
      params.append(key, value);
    } else if (Array.isArray(value)) {
      for (const v of value) params.append(key, v);
    }
  }

  const query = params.toString();
  const target = query ? `/dashboard/main?${query}` : `/dashboard/main`;
  redirect(target);
}
