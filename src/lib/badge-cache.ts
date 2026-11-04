const BADGE_CACHE_TTL_SECONDS = 3600;
const REPO_LATEST_PREFIX = "badge:repo:latest:";
const REPO_BADGE_PREFIX = "badge:repo:svg:";
const USER_LATEST_PREFIX = "badge:user:latest:";
const USER_BADGE_PREFIX = "badge:user:svg:";

export function getRepoLatestKey(owner: string, repo: string): string {
  return `${REPO_LATEST_PREFIX}${owner}/${repo}`;
}

export function getRepoBadgeKey(options: {
  owner: string;
  repo: string;
  variant: string;
  show: string;
  analyzedAt: number | string;
}): string {
  return `${REPO_BADGE_PREFIX}${options.owner}/${options.repo}:${options.variant}:${options.show}:${options.analyzedAt}`;
}

export function getUserBadgeKey(options: {
  user: string;
  variant: string;
  show: string;
  analyzedAt?: number | string;
}): string {
  const base = `${USER_BADGE_PREFIX}${options.user}:${options.variant}:${options.show}`;
  if (options.analyzedAt === undefined) return base;
  return `${base}:${options.analyzedAt}`;
}

export async function getCachedSvg(
  env: CloudflareEnv,
  key: string,
): Promise<string | null> {
  return env.KV.get(key);
}

export async function putCachedSvg(
  env: CloudflareEnv,
  key: string,
  svg: string,
): Promise<void> {
  await env.KV.put(key, svg, { expirationTtl: BADGE_CACHE_TTL_SECONDS });
}

export async function getRepoLatestAnalyzedAt(
  env: CloudflareEnv,
  owner: string,
  repo: string,
): Promise<string | null> {
  return env.KV.get(getRepoLatestKey(owner, repo));
}

export async function setRepoLatestAnalyzedAt(
  env: CloudflareEnv,
  owner: string,
  repo: string,
  analyzedAt: number | string,
): Promise<void> {
  await env.KV.put(getRepoLatestKey(owner, repo), String(analyzedAt));
}

export function getUserLatestKey(user: string): string {
  return `${USER_LATEST_PREFIX}${user}`;
}

export async function getUserLatestAnalyzedAt(
  env: CloudflareEnv,
  user: string,
): Promise<string | null> {
  return env.KV.get(getUserLatestKey(user));
}

export async function setUserLatestAnalyzedAt(
  env: CloudflareEnv,
  user: string,
  analyzedAt: number | string,
): Promise<void> {
  await env.KV.put(getUserLatestKey(user), String(analyzedAt));
}
