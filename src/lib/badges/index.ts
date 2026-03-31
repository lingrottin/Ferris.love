import opentype from "opentype.js";
// Although this is server-rendered, 'svgo' without '/browser'
// will try to import 'fs/promises' which Next refuses to resolves
import { optimize } from "svgo/browser";
import MiniBadge from "./mini";
import { RepoMixedBadge as RepoCardBadge } from "./repo-card";
import RepoHorizontalBadge from "./repo-horizontal";
import { UserCard } from "./user-card";

class placeHolderNumber {
  content: string;
  toLocaleString() {
    return this.content;
  }
  constructor(content: string) {
    this.content = content;
  }
}

export const DEFAULT_SHOW = [
  "call_fn",
  "def_fn",
  "def_struct",
  "def_method",
  "def_trait",
];

interface toLocaleStringAble {
  toLocaleString(): string;
}

export interface BadgeMetric {
  key: string;
  label: string;
  value: toLocaleStringAble;
}

export interface BadgeOptions {
  lorc: number;
  metrics: BadgeMetric[];
  name: string;
  variant?: string;
}

export function formatNumber(n: toLocaleStringAble): string {
  if (typeof n === "number") {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toString();
  } else {
    return n.toLocaleString();
  }
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

let _interRegularCache: ReturnType<typeof opentype.parse> | null = null;
let _interBoldCache: ReturnType<typeof opentype.parse> | null = null;
let _interBlackCache: ReturnType<typeof opentype.parse> | null = null;
let _adwaitaMonoBoldCache: ReturnType<typeof opentype.parse> | null = null;

export async function InterRegular(env: CloudflareEnv) {
  if (_interRegularCache) return _interRegularCache;
  const blob = await env.R2?.get("Inter_Regular.ttf").then((e) =>
    e?.arrayBuffer(),
  );
  if (!blob) throw new Error("Inter Regular font not found");
  _interRegularCache = opentype.parse(blob);
  return _interRegularCache;
}

export async function InterBold(env: CloudflareEnv) {
  if (_interBoldCache) return _interBoldCache;
  const blob = await env.R2?.get("Inter_Bold.ttf").then((e) =>
    e?.arrayBuffer(),
  );
  if (!blob) throw new Error("Inter Bold font not found");
  _interBoldCache = opentype.parse(blob);
  return _interBoldCache;
}

export async function InterBlack(env: CloudflareEnv) {
  if (_interBlackCache) return _interBlackCache;
  const blob = await env.R2?.get("Inter_Black.ttf").then((e) =>
    e?.arrayBuffer(),
  );
  if (!blob) throw new Error("Inter Black font not found");
  _interBlackCache = opentype.parse(blob);
  return _interBlackCache;
}

export async function AdwaitaMonoBold(env: CloudflareEnv) {
  if (_adwaitaMonoBoldCache) return _adwaitaMonoBoldCache;
  const blob = await env.R2?.get("AdwaitaMono_Bold.ttf").then((e) =>
    e?.arrayBuffer(),
  );
  if (!blob) throw new Error("Adwaita Mono Bold font not found");
  _adwaitaMonoBoldCache = opentype.parse(blob);
  return _adwaitaMonoBoldCache;
}

export async function generateBadge(options: BadgeOptions): Promise<string> {
  const { variant } = options;
  const unoptimized_svg = await (async () => {
    switch (variant) {
      case "horizontal":
        return await RepoHorizontalBadge(options);
      case "mini":
        return await MiniBadge(options);
      case "card":
        return await RepoCardBadge(options);
      case "big_lorc":
        return await UserCard(options);
      default:
        return await RepoHorizontalBadge(options);
    }
  })();
  return optimize(unoptimized_svg, {
    plugins: [
      {
        name: "preset-default",
        params: {
          overrides: {
            inlineStyles: false,
            cleanupNumericValues: {
              floatPrecision: 1,
            },
          },
        },
      },
    ],
  }).data;
}

export async function generatePlaceholderBadge(): Promise<string> {
  const metrics = [
    {
      key: "ph",
      label: "Please wait",
      value: new placeHolderNumber("N"),
    },
    {
      key: "ph2",
      label: "until it finishes",
      value: new placeHolderNumber("A"),
    },
  ];
  const options = {
    lorc: 0,
    name: "Analyzing in Progress",
    metrics,
  };
  return optimize(await RepoHorizontalBadge(options), {
    plugins: [
      {
        name: "preset-default",
        params: {
          overrides: {
            inlineStyles: false,
            cleanupNumericValues: {
              floatPrecision: 1,
            },
          },
        },
      },
    ],
  }).data;
}

export function ferris(x: number, y: number, height: number, width: number) {
  return `<svg width="${width}" height="${height}" x="${x}" y="${y}" fill="none" viewBox="0 0 81 56">
  <path fill="#f74c00" d="M78.5 34.9 74.7 32c-1.2-1-1-1.7-.5-3.2l.7-2.5a4 4 0 0 0-3-5l-3-.5-.7-.6.4-4.9a4 4 0 0 0-4.3-4l-3.4.2-1-.9-.5-3.2a4 4 0 0 0-5-3.1l-4 1.3-1-.3-3.2-3.9a4 4 0 0 0-5.3-.6L36.7 4l-1 .1-4.3-2.4a4 4 0 0 0-5.3 1.5l-2.6 4.9-.9.5-5-.6a4 4 0 0 0-4.3 3.5l-.6 6-.6.8-5.4 2.2A4 4 0 0 0 4.5 25L6 30.7l-4.8 5.1C-.1 37.3-.5 39.5.8 41c0 0 12.7 13 12.9 13.5.2-2.3-8.4-14.6-8-15.7q.9-1.4 1-1.2c.2.2 8.2 11.9 8.7 11.9.3-1.1-4-9.7-4.6-10.4l3 1c5.6 8.7 9.6 8.8 9.6 8.8C33.3 62.1 38 51.4 38 51.4a18 18 0 0 1-9.5-4.5C35.2 46 39 46 39 46c-9-12.4-16.2-1.2-16.2-1.2a9 9 0 0 1-3.7-3.5q2.6.6 5.3.9c2.6-2.5 7.6-5.4 13.5.8h4.6c6-7 10.6-3.8 12.9-1q3.9-.6 7.2-1.4a30 30 0 0 1-4 3.4l-2 .5S50 32.3 41 46c0 0 2.8-1.7 10.4.4A13 13 0 0 1 41 51.8s6.7 8.5 17-3.7c0 0 7.3-3 10.4-9.2l2.8-1.3c.2.5-4.9 11.3-4.4 12.1.6-1.5 7.3-11.2 7.4-12q.4.1.6.6c.6 2.4-5.6 14.9-4.8 16.5C71.9 53 80 39 80 39c1-1.7-.1-3-1.6-4.2"/>
  <path fill="#231815" d="M45.7 28.1s3.2-3.6 6.3 0c0 0 2.5 4.9 0 7.3 0 0-4 3.4-6.3 0 0 0-2.7-2.7 0-7.3"/>
  <path fill="#fff" d="M49.4 29.5q-.1 2.3-1.8 2.5c-1.7.2-1.8-1.1-1.8-2.5s.8-2.6 1.8-2.6 1.8 1.2 1.8 2.6"/>
  <path fill="#231815" d="M31.5 27.1s5.5-2.5 7 3.1c0 0 1.5 6.6-4.5 7 0 0-7.7-1.6-2.5-10"/>
  <path fill="#fff" d="M34.3 29.6c0 1.4-.9 2.6-1.9 2.6s-1.8-1.2-1.8-2.6.8-2.7 1.8-2.7 1.9 1.2 1.9 2.7"/>
</svg>`;
}

export function svgNum(
  strings: TemplateStringsArray,
  ...values: unknown[]
): string {
  return strings.reduce((result, str, i) => {
    const value = values[i];
    let formatted = "";
    if (typeof value === "number") {
      formatted = value.toFixed(2);
    } else if (value != null) {
      formatted = value.toString();
    }
    return result + str + formatted;
  }, "");
}

export function withClassName(xml: string, className?: string): string {
  if (!className) return xml;
  const trimmed = xml.trim();

  const ltIndex = trimmed.indexOf("<");
  if (ltIndex === -1) return xml;

  const gtIndex = trimmed.indexOf(">", ltIndex);
  if (gtIndex === -1) return xml;

  const isSelfClosing = trimmed[gtIndex - 1] === "/";

  if (isSelfClosing) {
    const before = trimmed.slice(0, gtIndex - 1); // 去掉最后的 `/`
    const after = trimmed.slice(gtIndex - 1); // 从 `/>` 开始
    return `${before} class="${className}"${after}`;
  } else {
    const before = trimmed.slice(0, gtIndex);
    const after = trimmed.slice(gtIndex); // 从 `>` 开始
    return `${before} class="${className}"${after}`;
  }
}

export function withSvgRoot(
  child: string,
  width: number,
  height: number,
  title: string,
): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeXml(title)}">
<title>${escapeXml(title)}</title>
${child}
</svg>`;
}

export function cssElement(css: string): string {
  return `<style><![CDATA[${css}]]></style>`;
}
