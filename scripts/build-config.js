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

function renderTemplate(template, vars) {
  const missing = new Set();
  const output = template.replace(
    /{{\s*([A-Za-z0-9_]+)\s*}}/g,
    (match, key) => {
      if (Object.prototype.hasOwnProperty.call(vars, key)) {
        return escapeJsonString(vars[key]);
      }

      missing.add(key);
      return match;
    },
  );

  if (missing.size > 0) {
    const list = Array.from(missing).sort().join(", ");
    throw new Error(`Missing env values for: ${list}`);
  }

  return output;
}

function main() {
  const env = readEnv(envPath);
  const imageLock = JSON.parse(fs.readFileSync(path.join(rootDir, "workers/counter/image.lock.json"), "utf8"));
  env.MATTHEW_IMAGE ??= imageLock.image;
  if (!/^registry\.cloudflare\.com\/[^\s]+@sha256:[a-f0-9]{64}$/.test(env.MATTHEW_IMAGE)) {
    throw new Error("MATTHEW_IMAGE must be a digest-pinned Cloudflare Registry image");
  }
  const template = fs.readFileSync(templatePath, "utf8");
  const rendered = renderTemplate(template, env);

  fs.writeFileSync(outputPath, rendered);
  const counterDir = path.join(rootDir, "workers", "counter");
  const counterTemplate = fs.readFileSync(path.join(counterDir, "wrangler.template.jsonc"), "utf8");
  fs.writeFileSync(path.join(counterDir, "wrangler.jsonc"), renderTemplate(counterTemplate, env));
  console.log(`Generated ${path.relative(rootDir, outputPath)}`);
}

main();
