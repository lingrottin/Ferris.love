# Ferris.love — Copilot Instructions

## Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start dev server with Turbopack + HMR |
| `pnpm build` | Build Next.js |
| `pnpm lint` | Run `next lint` |
| `pnpm deploy` | Build and deploy to Cloudflare Workers via OpenNext |
| `pnpm preview` | Build and preview Cloudflare Workers build locally |
| `pnpm types` | Regenerate Cloudflare env types |
| `pnpm run format` / `pnpm run lint:biome` | Format/lint code via **Biome** (the project's primary formatter and linter) |
| `node scripts/build-config.js` | Generate `wrangler.jsonc` from `.env` + `wrangler.template.jsonc` |

`pnpm check` checks TypeScript, `pnpm test:analysis` runs D1 migration/outbox/idempotency tests, and `pnpm build:worker` verifies the deployment bundle. No `turbo` or `nx` tooling.

## High-Level Architecture

This is a **Next.js 15** app (App Router) deployed to **Cloudflare Workers** via `@opennextjs/cloudflare`. It analyzes Rust repositories and generates SVG badges showing Rust code statistics (lines of Rust code, function calls, variable definitions, etc.).

### Data flow

1. User authenticates via **GitHub App** (Auth.js / NextAuth v5 with D1 adapter).
2. User adds a repository through the dashboard. The app registers a **GitHub webhook** on that repo and records commit-pinned jobs and a D1 outbox, then publishes job IDs to **Cloudflare Queues**.
3. The `ferris-counter` Queue consumer calls a per-job Durable Object. Its Cloudflare Container runs Matthew as a stdio CLI through native `ctx.container.exec()`. The consumer validates and writes results to D1 directly; the old callback returns 410.
4. Results are stored in D1 databases and cached in KV. SVG badges are rendered server-side using `opentype.js` font metrics and `svgo` optimization, then cached in KV with 1-hour TTL.

### Cloudflare resources

| Resource | Binding | Purpose |
|----------|---------|---------|
| D1 (Auth) | `DB_AUTH` | Auth.js session/account tables |
| D1 (Drizzle) | `DB` | App tables (users, repos, repo_stats, user_repos) |
| KV | `KV` | Badge SVG cache, rate limiting, auth migration flag |
| R2 | `R2` | Font files (Inter, Adwaita Mono) for badge rendering |
| Queues | `ANALYSIS_QUEUE` | Analysis jobs, retries and DLQ |
| Containers + Durable Objects | `MATTHEW` (Counter only) | Isolated stdio analysis and per-job deduplication |

### Directory structure

```
src/
├── app/
│   ├── actions/          # Server Actions (add/remove/recount repos, get stats, unregister)
│   ├── api/              # API routes
│   │   ├── auth/         # Auth.js catch-all route
│   │   ├── callback/     # Matthew analysis callback
│   │   └── webhook/      # GitHub push webhook + marketplace webhook
│   ├── badge/            # SVG badge generation routes (public)
│   ├── dashboard/        # User dashboard (main, stats, settings, repo detail)
│   ├── [owner]/[repo]/   # Public repository stats page
│   └── u/[owner]/        # Public user profile page
├── auth.ts               # Auth.js configuration with D1 adapter
├── auth.config.ts        # Auth provider config (GitHub)
├── middleware.ts          # Auth middleware — protects everything except /badge, /api/callback, /api/webhook
├── octokit.ts            # GitHub App (Octokit) client factory
├── components/
│   ├── ui/               # shadcn/ui components (radix-based)
│   └── ...               # App-specific components
├── db/
│   ├── schema.ts         # Drizzle ORM schema (users, repos, user_repos, repo_stats)
│   └── util.ts           # D1 database connection helper
└── lib/
    ├── badges/           # SVG badge generators (opentype.js + svgo)
    ├── badge-cache.ts    # KV-based badge caching
    └── rate-limit.ts     # KV-based rate limiting
```

## Key Conventions

### Database

- **Two D1 databases**: `DB_AUTH` (managed by `@auth/d1-adapter` with auto-migration via `up()`) and `DB` (managed via Drizzle Kit with `drizzle-kit` and manual SQL migrations in `drizzle/`).
- All app tables use **Drizzle ORM** with SQLite dialect. IDs are either GitHub IDs (text) or v7 UUIDs.
- The `meta` column on `users` is a JSON string stored as `text`.
- `repo_stats.counts` is a JSON blob storing the full breakdown of Rust AST counts (function calls, control flow, definitions, etc.).

### Badge system

- Badges are **server-rendered SVG** in route handlers (`/badge/[owner]`, `/badge/[owner]/[repo]`, `/badge/love`).
- Font metrics computed via `opentype.js` with font files served from **R2**.
- SVGs optimized via `svgo/browser` (not the Node.js version, to avoid `fs/promises` issues in Workers).
- Four badge variants: `horizontal`, `card`, `mini`, `big_lorc`.
- All SVG badge routes read 1-hour KV cache before generating, and write to KV after generation.
- Private repos' stats are **not** shown on public pages (`/u/[owner]`, `/[owner]/[repo]`).

### Server Actions

- All data mutations live in `src/app/actions/` as `"use server"` functions.
- Actions handle their own auth check via `auth()` and rate limiting via KV.
- Analysis requests use `src/lib/analysis/jobs.ts` and commit the job/outbox atomically before Queue publication. The Counter owns task execution. Do not reintroduce VPC, shared Matthew tokens or HTTP callbacks.

### Styling & UI

- **Tailwind CSS v4** via `@tailwindcss/postcss` (no `tailwind.config.js` — uses `@theme inline` in CSS).
- **shadcn/ui** components with New York style and Radix UI primitives.
- CSS variables in `src/app/styles.css` using `oklch()` color space with `@custom-variant dark` for dark mode.
- Icon library: **lucide-react** + `@icons-pack/react-simple-icons` (for GitHub icon).

### Code quality

- **Biome** handles both formatting (`indentStyle: space`, `indentWidth: 2`, `quoteStyle: double`) and linting.
- Import organizing uses Biome's `organizeImports` assist action (on-save).
- TypeScript with `strict: true`, `@/*` path alias mapping to `./src/*`.
- The `CloudflareEnv` global type is generated by `pnpm types` (`wrangler types --env-interface CloudflareEnv`).

### Auth & middleware

- Auth.js v5 with **JWT session strategy** (no database sessions).
- `middleware.ts` protects all routes **except**: `/badge*`, `/api/callback*`, `/api/webhook*`, `/_next/*`, `/favicon.ico`.
- Signed-out users accessing the dashboard are redirected to `/` with an error query param.

### GitHub App integration

- All GitHub API calls go through `src/octokit.ts` which creates either a synchronous or async Octokit `App` instance.
- Webhooks are registered per-repo, verified with per-repo HMAC-SHA256 secrets stored in the database.
- GitHub App installation ID is fetched on-demand and cached in-memory via `react.cache()`.
