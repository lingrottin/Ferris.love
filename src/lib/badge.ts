export interface BadgeStats {
  fn_count: number;
  struct_count: number;
  enum_count: number;
  trait_count: number;
}

export function generateBadge(
  stats: BadgeStats,
  repoName: string,
  theme?: "light" | "dark",
): string {
  const width = 420;
  const height = 120;

  // Ferris crab simplified SVG path (geometric approximation)
  const ferrisIcon = `
    <g transform="translate(16, 28) scale(0.55)">
      <!-- body -->
      <ellipse cx="50" cy="55" rx="45" ry="32" fill="#F74C00"/>
      <!-- left eye -->
      <ellipse cx="32" cy="42" rx="8" ry="10" fill="white"/>
      <ellipse cx="32" cy="44" rx="4" ry="5" fill="#333"/>
      <!-- right eye -->
      <ellipse cx="68" cy="42" rx="8" ry="10" fill="white"/>
      <ellipse cx="68" cy="44" rx="4" ry="5" fill="#333"/>
      <!-- left claw -->
      <path d="M5 50 Q-8 35 2 25 Q8 30 12 40 Z" fill="#F74C00"/>
      <path d="M5 50 Q-12 40 -5 28 Q2 25 2 25 Q8 30 12 40 Z" fill="#D94000" opacity="0.5"/>
      <!-- right claw -->
      <path d="M95 50 Q108 35 98 25 Q92 30 88 40 Z" fill="#F74C00"/>
      <path d="M95 50 Q112 40 105 28 Q98 25 98 25 Q92 30 88 40 Z" fill="#D94000" opacity="0.5"/>
      <!-- legs -->
      <line x1="15" y1="70" x2="5" y2="85" stroke="#F74C00" stroke-width="4" stroke-linecap="round"/>
      <line x1="30" y1="75" x2="22" y2="90" stroke="#F74C00" stroke-width="4" stroke-linecap="round"/>
      <line x1="70" y1="75" x2="78" y2="90" stroke="#F74C00" stroke-width="4" stroke-linecap="round"/>
      <line x1="85" y1="70" x2="95" y2="85" stroke="#F74C00" stroke-width="4" stroke-linecap="round"/>
      <!-- smile -->
      <path d="M35 60 Q50 72 65 60" fill="none" stroke="#8B2500" stroke-width="2.5" stroke-linecap="round"/>
    </g>
  `;

  const statItems = [
    { label: "fns", value: stats.fn_count },
    { label: "structs", value: stats.struct_count },
    { label: "enums", value: stats.enum_count },
    { label: "traits", value: stats.trait_count },
  ];

  const statsSvg = statItems
    .map((item, i) => {
      const x = 90 + i * 82;
      return `
      <g class="stat" style="animation-delay: ${i * 0.1}s">
        <text x="${x}" y="58" class="stat-value">${item.value}</text>
        <text x="${x}" y="76" class="stat-label">${item.label}</text>
      </g>`;
    })
    .join("\n");

  // Theme colors
  const lightBg = "#ffffff";
  const lightFg = "#24292e";
  const lightMuted = "#586069";
  const lightBorder = "#e1e4e8";

  const darkBg = "#0d1117";
  const darkFg = "#c9d1d9";
  const darkMuted = "#8b949e";
  const darkBorder = "#30363d";

  // Use explicit theme if provided, otherwise use prefers-color-scheme
  const useMediaQuery = !theme;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Ferris.love stats for ${escapeXml(repoName)}">
  <title>Ferris.love stats for ${escapeXml(repoName)}</title>
  <defs>
    <style>
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(4px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .stat {
        opacity: 0;
        animation: fadeIn 0.4s ease-out forwards;
      }
      ${
        useMediaQuery
          ? `
      /* Light theme (default) */
      .card-bg { fill: ${lightBg}; }
      .card-border { stroke: ${lightBorder}; }
      .repo-name { fill: ${lightFg}; }
      .stat-value { fill: ${lightFg}; }
      .stat-label { fill: ${lightMuted}; }
      .brand { fill: ${lightMuted}; }

      @media (prefers-color-scheme: dark) {
        .card-bg { fill: ${darkBg}; }
        .card-border { stroke: ${darkBorder}; }
        .repo-name { fill: ${darkFg}; }
        .stat-value { fill: ${darkFg}; }
        .stat-label { fill: ${darkMuted}; }
        .brand { fill: ${darkMuted}; }
      }`
          : theme === "dark"
            ? `
      .card-bg { fill: ${darkBg}; }
      .card-border { stroke: ${darkBorder}; }
      .repo-name { fill: ${darkFg}; }
      .stat-value { fill: ${darkFg}; }
      .stat-label { fill: ${darkMuted}; }
      .brand { fill: ${darkMuted}; }`
            : `
      .card-bg { fill: ${lightBg}; }
      .card-border { stroke: ${lightBorder}; }
      .repo-name { fill: ${lightFg}; }
      .stat-value { fill: ${lightFg}; }
      .stat-label { fill: ${lightMuted}; }
      .brand { fill: ${lightMuted}; }`
      }

      .repo-name {
        font: 600 14px 'Segoe UI', Ubuntu, 'Helvetica Neue', Sans-Serif;
      }
      .stat-value {
        font: 700 20px 'Segoe UI', Ubuntu, 'Helvetica Neue', Sans-Serif;
        text-anchor: middle;
      }
      .stat-label {
        font: 400 11px 'Segoe UI', Ubuntu, 'Helvetica Neue', Sans-Serif;
        text-anchor: middle;
      }
      .brand {
        font: 400 10px 'Segoe UI', Ubuntu, 'Helvetica Neue', Sans-Serif;
      }
    </style>
  </defs>

  <rect class="card-bg card-border" x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="6" ry="6" stroke-width="1" fill-opacity="1"/>

  ${ferrisIcon}

  <text x="90" y="36" class="repo-name">${escapeXml(repoName)}</text>

  ${statsSvg}

  <text x="${width - 10}" y="${height - 8}" class="brand" text-anchor="end">ferris.love</text>
</svg>`;
}

export function generatePlaceholderBadge(repoName: string): string {
  const width = 300;
  const height = 60;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="No stats yet for ${escapeXml(repoName)}">
  <title>No stats yet for ${escapeXml(repoName)}</title>
  <defs>
    <style>
      .bg { fill: #f6f8fa; }
      .border { stroke: #e1e4e8; }
      .text { fill: #586069; font: 400 12px 'Segoe UI', Ubuntu, 'Helvetica Neue', Sans-Serif; }
      @media (prefers-color-scheme: dark) {
        .bg { fill: #0d1117; }
        .border { stroke: #30363d; }
        .text { fill: #8b949e; }
      }
    </style>
  </defs>
  <rect class="bg border" x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="6" ry="6" stroke-width="1"/>
  <text x="${width / 2}" y="${height / 2 + 4}" class="text" text-anchor="middle">${escapeXml(repoName)} — no stats yet</text>
</svg>`;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
