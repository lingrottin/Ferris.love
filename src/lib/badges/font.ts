/**
 * Replaces opentype.js runtime font loading with pre-baked SVG path data.
 *
 * Each baked font JSON contains { upm, chars: { [ch]: { d: string, aw: number } } }.
 * - d: SVG path data for the glyph (at upm scale)
 * - aw: advance width in font units
 *
 * At runtime, text is rendered by scaling char paths by fontSize/upm and
 * translating to (x, y) — no font parsing or bezier curve computation.
 */

// Lazy-loaded baked font data
const _fontCache: Record<string, BakedFont | null> = {};
type BakedFont = {
  upm: number;
  chars: Record<string, { d: string; aw: number }>;
};

async function loadBakedFont(name: string): Promise<BakedFont> {
  const cached = _fontCache[name];
  if (cached !== undefined) {
    if (cached !== null) return cached;
    throw new Error(`Baked font "${name}" not found`);
  }
  try {
    const mod = await import(`./fonts/${name}.json`);
    const font = (mod.default ?? mod) as BakedFont;
    _fontCache[name] = font;
    return font;
  } catch {
    _fontCache[name] = null;
    throw new Error(`Baked font "${name}" not found`);
  }
}

/** Mimics opentype.js getAdvanceWidth(text, fontSize) */
function getAdvanceWidth(
  font: BakedFont,
  text: string,
  fontSize: number,
): number {
  const scale = fontSize / font.upm;
  let w = 0;
  for (const ch of text) {
    const glyph = font.chars[ch];
    if (glyph) w += glyph.aw;
  }
  return w * scale;
}

/** Mimics opentype.js getPath(text, x, y, fontSize) → toSVG(dp) */
function getPath(
  font: BakedFont,
  text: string,
  x: number,
  y: number,
  fontSize: number,
): { toSVG(dp?: number): string } {
  const scale = fontSize / font.upm;
  const parts: string[] = [];
  let offset = x;
  for (const ch of text) {
    const glyph = font.chars[ch];
    if (!glyph) {
      offset += fontSize * 0.3; // rough fallback advance for unknown chars
      continue;
    }
    if (glyph.d) {
      parts.push(
        `<path d="${glyph.d}" transform="translate(${offset.toFixed(2)},${y.toFixed(2)}) scale(${scale})"/>`,
      );
    }
    offset += glyph.aw * scale;
  }
  const svg = `<g>${parts.join("")}</g>`;
  return {
    toSVG(_dp?: number) {
      return svg;
    },
  };
}

// ---- Public API (replaces the R2-loaded opentype.js functions) ----

export async function InterRegular() {
  const font = await loadBakedFont("inter-regular");
  return {
    getAdvanceWidth: (text: string, size: number) =>
      getAdvanceWidth(font, text, size),
    getPath: (text: string, x: number, y: number, size: number) =>
      getPath(font, text, x, y, size),
  };
}

export async function InterBold() {
  const font = await loadBakedFont("inter-bold");
  return {
    getAdvanceWidth: (text: string, size: number) =>
      getAdvanceWidth(font, text, size),
    getPath: (text: string, x: number, y: number, size: number) =>
      getPath(font, text, x, y, size),
  };
}

export async function InterBlack() {
  const font = await loadBakedFont("inter-black");
  return {
    getAdvanceWidth: (text: string, size: number) =>
      getAdvanceWidth(font, text, size),
    getPath: (text: string, x: number, y: number, size: number) =>
      getPath(font, text, x, y, size),
  };
}

export async function AdwaitaMonoBold() {
  const font = await loadBakedFont("adwaita-mono-bold");
  return {
    getAdvanceWidth: (text: string, size: number) =>
      getAdvanceWidth(font, text, size),
    getPath: (text: string, x: number, y: number, size: number) =>
      getPath(font, text, x, y, size),
  };
}
