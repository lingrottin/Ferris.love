export const COUNTS_LABELS: Record<string, string> = {
  call_fn: "Fn Calls",
  call_method: "Method Calls",
  call_macro: "Macro Calls",
  block_if: "If Blocks",
  block_else: "Else Blocks",
  block_match: "Match Exprs",
  block_match_arms: "Match Arms",
  block_for: "For Loops",
  block_while: "While Loops",
  block_loop: "Loops",
  block_unsafe: "Unsafe Blocks",
  def_var: "Variables",
  def_var_mut: "Mut Variables",
  def_fn: "Functions",
  def_method: "Methods",
  def_async_fn: "Async Fns",
  def_async_method: "Async Methods",
  def_trait: "Traits",
  def_type: "Type Aliases",
  def_enum: "Enums",
  def_struct: "Structs",
  def_union: "Unions",
  def_mod: "Modules",
  def_const: "Constants",
  def_static: "Statics",
  trait_impl: "Trait Impls",
  def_impl: "Impl Blocks",
  def_macro_rules: "Macro Defs",
  expr_closure: "Closures",
  expr_await: "Awaits",
  expr_try: "Try (?)",
  expr_return: "Returns",
  expr_yield: "Yields",
  expr_binop: "Binary Ops",
  expr_unop: "Unary Ops",
  use_stmt: "Use Stmts",
  extern_crate: "Extern Crates",
  def_struct_fields: "Struct Fields",
  def_enum_variants: "Enum Variants",
  def_trait_members: "Trait Members",
  def_impl_members: "Impl Members",
  def_test_fn: "Test Fns",
};

export const DEFAULT_SHOW = [
  "def_fn",
  "def_struct",
  "def_enum",
  "def_trait",
  "def_impl",
];

export interface BadgeMetric {
  key: string;
  label: string;
  value: number;
}

export interface BadgeOptions {
  lorc: number;
  metrics: BadgeMetric[];
  repoName: string;
  theme?: "light" | "dark";
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Geometric Ferris crab icon (simplified, flat)
const FERRIS_ICON = `<g transform="translate(12, 8) scale(0.55)">
  <ellipse cx="30" cy="32" rx="24" ry="16" fill="#F74C00" opacity="0.9"/>
  <ellipse cx="30" cy="30" rx="22" ry="14" fill="#F74C00"/>
  <circle cx="22" cy="27" r="3.5" fill="white"/>
  <circle cx="38" cy="27" r="3.5" fill="white"/>
  <circle cx="22" cy="27" r="1.8" fill="#222"/>
  <circle cx="38" cy="27" r="1.8" fill="#222"/>
  <path d="M4 28 Q0 20 6 16" stroke="#F74C00" stroke-width="3.5" fill="none" stroke-linecap="round"/>
  <path d="M56 28 Q60 20 54 16" stroke="#F74C00" stroke-width="3.5" fill="none" stroke-linecap="round"/>
  <circle cx="6" cy="15" r="2.5" fill="#F74C00"/>
  <circle cx="54" cy="15" r="2.5" fill="#F74C00"/>
  <path d="M8 38 Q4 44 2 48" stroke="#F74C00" stroke-width="3" fill="none" stroke-linecap="round"/>
  <path d="M14 42 Q12 48 10 52" stroke="#F74C00" stroke-width="3" fill="none" stroke-linecap="round"/>
  <path d="M24 44 Q24 50 24 54" stroke="#F74C00" stroke-width="3" fill="none" stroke-linecap="round"/>
  <path d="M36 44 Q36 50 36 54" stroke="#F74C00" stroke-width="3" fill="none" stroke-linecap="round"/>
  <path d="M46 42 Q48 48 50 52" stroke="#F74C00" stroke-width="3" fill="none" stroke-linecap="round"/>
  <path d="M52 38 Q56 44 58 48" stroke="#F74C00" stroke-width="3" fill="none" stroke-linecap="round"/>
</g>`;

export function generateBadge(options: BadgeOptions): string {
  const { lorc, metrics, repoName, theme } = options;
  const isDark = theme === "dark";

  // Layout calculations
  const leftWidth = 140;
  const metricWidth = 90;
  const rightWidth = Math.max(metrics.length * metricWidth, metricWidth);
  const totalWidth = leftWidth + rightWidth;
  const height = 56;

  // Colors
  const bgLeft = isDark ? "#1a1a2e" : "#F74C00";
  const bgRight = isDark ? "#16213e" : "#fff8f5";
  const textLeft = "#ffffff";
  const textRight = isDark ? "#e0e0e0" : "#333333";
  const textRightSub = isDark ? "#888" : "#666";
  const borderColor = isDark ? "#333" : "#e0d6d0";

  const metricsXml = metrics
    .map((m, i) => {
      const x = leftWidth + i * metricWidth + metricWidth / 2;
      return `<g class="badge-fade" style="animation-delay: ${(i + 1) * 0.1}s">
      <text x="${x}" y="24" text-anchor="middle" fill="${textRight}" font-size="13" font-weight="700" font-family="'Segoe UI',Roboto,sans-serif">${formatNumber(m.value)}</text>
      <text x="${x}" y="40" text-anchor="middle" fill="${textRightSub}" font-size="9" font-family="'Segoe UI',Roboto,sans-serif">${escapeXml(m.label)}</text>
    </g>`;
    })
    .join("\n    ");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${height}" viewBox="0 0 ${totalWidth} ${height}" role="img" aria-label="${escapeXml(repoName)} Rust stats">
  <title>${escapeXml(repoName)} — ${formatNumber(lorc)} Lines of Rust</title>
  <style>
    .badge-fade { opacity: 0; animation: fadeIn 0.4s ease forwards; }
    @keyframes fadeIn { to { opacity: 1; } }
    @media (prefers-color-scheme: dark) {
      .auto-bg-left { fill: #1a1a2e; }
      .auto-bg-right { fill: #16213e; }
      .auto-text-right { fill: #e0e0e0; }
      .auto-text-right-sub { fill: #888; }
      .auto-border { stroke: #333; }
    }
  </style>
  <rect width="${leftWidth}" height="${height}" rx="6" ry="6" fill="${bgLeft}"/>
  <rect x="${leftWidth}" width="${rightWidth}" height="${height}" fill="${bgRight}"/>
  <rect x="${leftWidth - 1}" width="${rightWidth + 1}" height="${height}" rx="0" ry="0" fill="${bgRight}"/>
  <rect width="${totalWidth}" height="${height}" rx="6" ry="6" fill="none" stroke="${borderColor}" stroke-width="1"/>
  <clipPath id="cl"><rect width="${totalWidth}" height="${height}" rx="6" ry="6"/></clipPath>
  <g clip-path="url(#cl)">
    <rect width="${leftWidth}" height="${height}" fill="${bgLeft}"/>
    <rect x="${leftWidth}" width="${rightWidth}" height="${height}" fill="${bgRight}"/>
    ${FERRIS_ICON}
    <g class="badge-fade">
      <text x="78" y="23" fill="${textLeft}" font-size="10" font-weight="600" font-family="'Segoe UI',Roboto,sans-serif">${escapeXml(repoName)}</text>
      <text x="78" y="40" fill="${textLeft}" font-size="14" font-weight="800" font-family="'Segoe UI',Roboto,sans-serif">${formatNumber(lorc)} LoRC</text>
    </g>
    ${metricsXml}
  </g>
</svg>`;
}

export function generatePlaceholderBadge(repoName: string): string {
  const width = 280;
  const height = 56;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeXml(repoName)} analyzing">
  <title>${escapeXml(repoName)} — Analyzing...</title>
  <style>
    .pulse { animation: pulse 1.5s ease-in-out infinite; }
    @keyframes pulse { 0%, 100% { opacity: 0.6; } 50% { opacity: 1; } }
  </style>
  <rect width="${width}" height="${height}" rx="6" ry="6" fill="#F74C00"/>
  <rect width="${width}" height="${height}" rx="6" ry="6" fill="none" stroke="#e0d6d0" stroke-width="1"/>
  <clipPath id="cl"><rect width="${width}" height="${height}" rx="6" ry="6"/></clipPath>
  <g clip-path="url(#cl)">
    ${FERRIS_ICON}
    <text x="78" y="23" fill="white" font-size="10" font-weight="600" font-family="'Segoe UI',Roboto,sans-serif">${escapeXml(repoName)}</text>
    <text class="pulse" x="78" y="40" fill="white" font-size="13" font-weight="700" font-family="'Segoe UI',Roboto,sans-serif">Analyzing...</text>
  </g>
</svg>`;
}
