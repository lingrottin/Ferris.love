/**
 * Pre-bakes TTF font files into SVG path + advance width JSON.
 *
 * Usage:
 *   node scripts/bake-font-paths.mjs <name> <ttf-path>
 *
 * Output: src/lib/badges/fonts/<name>.json
 *
 * Characters baked: ASCII 32-126 (printable), plus common extras.
 * The path data is extracted at upm scale and will be scaled at runtime.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import opentype from "opentype.js";

const OUT_DIR = join(import.meta.dirname, "..", "src", "lib", "badges", "fonts");

// Characters to bake — covers all text used in badge rendering
const CHARS = Array.from({ length: 95 }, (_, i) => String.fromCodePoint(i + 32))
  .join("");

function bakeFont(name, ttfPath) {
  const buf = readFileSync(ttfPath);
  const font = opentype.parse(buf.buffer);

  const upm = font.unitsPerEm;
  const result = {
    name,
    upm,
    family: font.names?.fontFamily?.en || name,
    weight: font.tables?.os2?.usWeightClass || 400,
    chars: {},
  };

  for (const ch of CHARS) {
    const glyphIndex = font.charToGlyphIndex(ch);
    if (glyphIndex === 0 && ch !== "\0") continue; // .notdef

    const glyph = font.glyphs.get(glyphIndex);
    if (!glyph) continue;

    const path = glyph.getPath(0, 0, upm);
    const pathD = path.toPathData(2);

    result.chars[ch] = {
      d: pathD || "",
      aw: glyph.advanceWidth,
    };

    if (!pathD && ch !== " ") {
      console.warn(`  Warning: ${ch} (U+${ch.codePointAt(0).toString(16)}) has empty path`);
    }
  }

  const outPath = join(OUT_DIR, `${name}.json`);
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(outPath, JSON.stringify(result), "utf-8");

  const charCount = Object.keys(result.chars).length;
  console.log(`  Wrote ${outPath} (${charCount} chars, upm=${upm}, weight=${result.weight})`);
}

// ---- main ----

const [,, name, ttfPath] = process.argv;
if (!name || !ttfPath) {
  console.error("Usage: node scripts/bake-font-paths.mjs <name> <ttf-path>");
  process.exit(1);
}

console.log(`Baking "${name}" from ${ttfPath}...`);
bakeFont(name, ttfPath);
