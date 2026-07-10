const fs = require("node:fs");
const path = require("node:path");
const dotenv = require("dotenv");

const rootDir = path.resolve(__dirname, "..");
const envPath = path.join(rootDir, ".env");
const templatePath = path.join(rootDir, "wrangler.template.jsonc");
const outputPath = path.join(rootDir, "wrangler.jsonc");

function readEnv(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing env file: ${filePath}`);
  }

  const raw = fs.readFileSync(filePath, "utf8");
  return dotenv.parse(raw);
}

function escapeJsonString(value) {
  return JSON.stringify(value).slice(1, -1);
}

/**
 * Builds wrangler.jsonc from wrangler.template.jsonc + .env
 *
 * Required vars: {{VAR}} — must exist in .env
 * Optional vars: {{VAR?}} — silently skipped if missing
 */
function renderTemplate(template, vars) {
  const missing = new Set();
  const output = template.replace(
    /{{\s*([A-Za-z0-9_]+)\??\s*}}/g,
    (match, key) => {
      const optional = match.includes("?");
      const cleanKey = key.replace(/\?$/, "");
      if (Object.prototype.hasOwnProperty.call(vars, cleanKey)) {
        return escapeJsonString(vars[cleanKey]);
      }

      if (!optional) {
        missing.add(cleanKey);
      }
      return match; // leave optional missing vars as-is
    },
  );

  if (missing.size > 0) {
    const list = Array.from(missing).sort().join(", ");
    throw new Error(`Missing env values for: ${list}`);
  }

  return output;
}

function main() {
  const env = { ...process.env, ...readEnv(envPath) };
  const template = fs.readFileSync(templatePath, "utf8");
  const rendered = renderTemplate(template, env);

  fs.writeFileSync(outputPath, rendered);
  console.log(`Generated ${path.relative(rootDir, outputPath)}`);
}

main();
