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

function pickFromPool(
  pool: BadgeChoice[],
  excludeVariant?: string,
): BadgeChoice {
  const candidates = excludeVariant
    ? pool.filter((item) => item.variant !== excludeVariant)
    : pool;
  const list = candidates.length > 0 ? candidates : pool;
  return list[Math.floor(Math.random() * list.length)];
}

export function BadgeExamples() {
  const [current, setCurrent] = useState<BadgeChoice | null>(null);
  const [animationKey, setAnimationKey] = useState(0);
  const nextRef = useRef<BadgeChoice | null>(null);
  const poolRef = useRef<BadgeChoice[]>([]);
  const currentVariantRef = useRef<string | null>(null);
  const variants = useRef<("horizontal" | "card" | "mini")[]>(VARIANTS);

  useEffect(() => {
    const buildNextChoice = (excludeVariant?: string) => {
      if (poolRef.current.length < 5) {
        const existingRepos = new Set(
          poolRef.current.map((choice) => choice.repo),
        );
        const created = pickRandomChoice(
          variants.current,
          excludeVariant,
          existingRepos,
        );
        poolRef.current = [...poolRef.current, created];
        if (created.variant === "mini") {
          variants.current.splice(variants.current.indexOf("mini"));
        }
        return created;
      }

      return pickFromPool(poolRef.current, excludeVariant);
    };

    const initial = buildNextChoice();
    setCurrent(initial);
    currentVariantRef.current = initial.variant;

    const next = buildNextChoice(initial.variant);
    nextRef.current = next;
    preloadImage(next.src);

    const intervalId = setInterval(() => {
      const nextChoice =
        nextRef.current ??
        buildNextChoice(currentVariantRef.current ?? undefined);
      setCurrent(nextChoice);
      currentVariantRef.current = nextChoice.variant;
      setAnimationKey((key) => key + 1);

      const upcoming = buildNextChoice(nextChoice.variant);
      nextRef.current = upcoming;
      preloadImage(upcoming.src);
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
