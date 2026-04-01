"use client";

import { useEffect, useRef, useState } from "react";

type BadgeChoice = {
  repo: string;
  variant: string;
  src: string;
};

const PRESET_REPOS = [
  "rust-lang/rust",
  "rust-lang/rust-analyzer",
  "biomejs/biome",
  "denoland/deno",
  "tokio-rs/tokio",
  "tikv/tikv",
  "bevyengine/bevy",
  "yewstack/yew",
  "slint-ui/slint",
  "serde-rs/serde",
  "tursodatabase/turso",
];
const VARIANTS: ("horizontal" | "card" | "mini")[] = [
  "horizontal",
  "card",
  "mini",
];

function buildBadgeSrc(repo: string, variant: string) {
  const [owner, repoName] = repo.split("/");
  const safeOwner = encodeURIComponent(owner ?? "");
  const safeRepo = encodeURIComponent(repoName ?? "");
  return `/badge/${safeOwner}/${safeRepo}?variant=${variant}`;
}

function pickRandomChoice(
  variants: ("horizontal" | "card" | "mini")[],
  excludeVariant?: string,
  excludeRepos: Set<string> = new Set(),
): BadgeChoice {
  const availableRepos = PRESET_REPOS.filter((repo) => !excludeRepos.has(repo));
  const repoList = availableRepos.length > 0 ? availableRepos : PRESET_REPOS;
  const repo = repoList[Math.floor(Math.random() * repoList.length)];
  const availableVariants = excludeVariant
    ? variants.filter((variant) => variant !== excludeVariant)
    : variants;
  const variant =
    availableVariants[Math.floor(Math.random() * availableVariants.length)];
  const src = buildBadgeSrc(repo, variant);
  return { repo, variant, src };
}

function preloadImage(src: string) {
  const img = new Image();
  img.decoding = "async";
  img.src = src;
}

function buildChoicePool(size: number): BadgeChoice[] {
  const pool: BadgeChoice[] = [];
  let excludeVariant: string | undefined;

  while (pool.length < size) {
    const existingRepos = new Set(pool.map((choice) => choice.repo));
    const choice = pickRandomChoice(VARIANTS, excludeVariant, existingRepos);
    pool.push(choice);
    excludeVariant = choice.variant;
  }

  return pool;
}

function preloadChoices(choices: BadgeChoice[]) {
  for (const choice of choices) {
    preloadImage(choice.src);
  }
}

export function BadgeExamples() {
  const [current, setCurrent] = useState<BadgeChoice | null>(null);
  const [animationKey, setAnimationKey] = useState(0);
  const poolRef = useRef<BadgeChoice[]>([]);
  const indexRef = useRef(0);

  useEffect(() => {
    const pool = buildChoicePool(5);
    poolRef.current = pool;
    preloadChoices(pool);

    setCurrent(pool[0] ?? null);
    indexRef.current = 0;

    const intervalId = setInterval(() => {
      if (poolRef.current.length === 0) {
        return;
      }
      indexRef.current = (indexRef.current + 1) % poolRef.current.length;
      setCurrent(poolRef.current[indexRef.current]);
      setAnimationKey((key) => key + 1);
    }, 5000);

    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="badge-examples h-60 flex flex-row justify-center items-center bg-muted min-w-screen md:min-w-[80vw] lg:min-w-[70vw] rounded-3xl border my-4">
      {current ? (
        // biome-ignore lint/performance/noImgElement: <Image> will mess up badge generation
        <img
          key={animationKey}
          className="badge-examples__image mx-4"
          src={current.src}
          alt={`${current.repo} ${current.variant} badge`}
        />
      ) : null}
      <style jsx>{`
        .badge-examples__image {
          animation: badge-fade 5s linear;
          display: block;
          height: auto;
          max-width: 100%;
          opacity: 0;
        }

        @keyframes badge-fade {
          0% {
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
