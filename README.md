# [Ferris.love](https://ferris.love)

[Ferris.love](https://ferris.love) counts your Rust code and generates badges for you. Show how you love [Ferris](https://rustacean.net/)!

⬇️ Metric of [Matthew](https://github.com/lingrottin/matthew), [Ferris.love](https://ferris.love)'s counting backend service.

[![Ferris.love badge](https://ferris.love/badge/lingrottin/matthew?show=call_fn%2Cdef_fn%2Cdef_struct%2Cdef_method%2Cdef_trait)](https://ferris.love/lingrottin/matthew)

<details>
<summary>some ugly AI-generated instructions, you probably do not want to read this</summary>
Ferris.love analyzes Rust repositories on Cloudflare. The web Worker records an immutable commit SHA and a D1 outbox entry, then sends a job ID to Cloudflare Queues. The `ferris-counter` consumer runs Matthew in a Container through `ctx.container.exec()` with JSON stdin/stdout. Results go directly to D1; no VPS, Tunnel, VPC service, HTTP analysis server, or callback secret is required.

## Development and deployment

`workers/counter/image.lock.json` pins the deployed Matthew image by digest. A normal Ferris deployment uses this image directly and needs only the Ferris checkout. For another Cloudflare account, publish Matthew to that account's registry and set `MATTHEW_IMAGE` in `.env` to its digest-pinned image reference.

To release a new Matthew version, checkout its source beside Ferris, build the image, push it, then update `image.lock.json` with the returned registry digest before running `pnpm run config` and redeploying the Counter:

```sh
docker build --platform linux/amd64 -t ferris-matthew:release ../matthew
pnpm exec wrangler containers push ferris-matthew:release
docker image inspect ferris-matthew:release --format '{{json .RepoDigests}}'
```

The Dockerfile's build context must be the Matthew repository. With Podman, pass `--path-to-docker /usr/bin/podman` to the push command; on hosts where rootless networking is unavailable, build with `podman build --network=host`.

Use Node.js 22+, pnpm, Wrangler 4.156.2+, and Docker (or a compatible Podman setup). Containers and Queues require a Workers Paid account. The existing Next.js 15 application currently needs OpenNext's `--dangerouslyUseUnsupportedNextVersion` flag, included in `build:worker`; upgrading the application framework is separate from this migration.

Create these Cloudflare resources:

- D1 databases `db` (Auth.js) and `db_drizzle` (application data).
- A Workers KV namespace and an R2 bucket named `ferris-love`.
- Queues `ferris-analysis` and `ferris-analysis-dlq`.

Set `.env` (never commit it):

```dotenv
AUTH_DB_ID="..."
DRIZZLE_DB_ID="..."
KV_ID="..."
AUTH_GITHUB_ID="..."
AUTH_TRUST_HOST="true"
AUTH_URL="https://your.domain/api/auth"
BASE_URL="https://your.domain"
GITHUB_APP_NAME="your-github-app-name"
GITHUB_APP_ID="..."
```

Generate both Wrangler configs, then create queues and apply the application migrations:

```sh
pnpm install --frozen-lockfile
pnpm run config
pnpm exec wrangler login
pnpm exec wrangler queues create ferris-analysis
pnpm exec wrangler queues create ferris-analysis-dlq
pnpm exec wrangler d1 migrations apply db_drizzle --remote
```

For an existing installation, migrations `0000`–`0006` must already be recorded as applied; `0007_analysis_queue.sql` is additive and preserves existing results. Do not replay the old schema migrations manually.

Set `AUTH_SECRET`, `AUTH_GITHUB_SECRET`, and `GITHUB_APP_PRIVATE_KEY` as secrets on the web Worker. Set `GITHUB_APP_PRIVATE_KEY` on the Counter as well.

Both deployed Workers must use a private key from the GitHub App whose numeric ID is configured as `GITHUB_APP_ID`. Keep development App credentials separate; a development PEM cannot sign tokens for the production App. `.env` is used to generate production resource IDs and non-secret settings, while `.dev.vars` supplies local runtime secrets.

For the private key, use PKCS#8 PEM (`BEGIN PRIVATE KEY`), which Workers Web Crypto supports. Convert a GitHub PKCS#1 download without changing the key:

```sh
openssl pkcs8 -topk8 -nocrypt -in /path/to/github-app.private-key.pem |
  pnpm exec wrangler secret put GITHUB_APP_PRIVATE_KEY --config workers/counter/wrangler.jsonc
```

The interactive commands below also accept an already converted PKCS#8 PEM:

```sh
pnpm exec wrangler secret put AUTH_SECRET
pnpm exec wrangler secret put AUTH_GITHUB_SECRET
pnpm exec wrangler secret put GITHUB_APP_PRIVATE_KEY
pnpm exec wrangler secret put GITHUB_APP_PRIVATE_KEY --config workers/counter/wrangler.jsonc
```

Upload `Inter_Regular.ttf`, `Inter_Bold.ttf`, `Inter_Black.ttf`, and `AdwaitaMono_Bold.ttf` to R2. Fonts are available from [Google Fonts](https://fonts.google.com/specimen/Inter) and [GNOME](https://gitlab.gnome.org/GNOME/adwaita-fonts).

Validate and deploy the consumer before deploying the web Worker:

```sh
pnpm types
pnpm check
pnpm test:analysis
pnpm deploy:counter
pnpm deploy
```

For local development, put runtime variables/secrets in `.dev.vars`, run `pnpm dev`, and use `pnpm preview` for the Workers build. `pnpm dev:counter` starts the queue consumer with local bindings and a local container engine. Private repository analysis needs a real GitHub App key, installation, and outbound GitHub access.

## Queue and failure behavior

- Queue messages contain only `{ version: 1, jobId }`. Installation tokens are minted just before execution and passed over stdin.
- The D1 outbox and stats row commit together. A minute cron retries jobs whose initial publication failed.
- Queue delivery is at least once. Each job has a stable Durable Object ID, cached final output, and conditional D1 writes. Forced recounts replace the stats row's job pointer, so an earlier attempt cannot overwrite them.
- Default-branch pushes pin their exact SHA. Other branches, tags and deletions are ignored. The newest requested successful snapshot is displayed even if jobs finish out of order.
- Consumer concurrency is four. Commands run under a ten-minute process-group timeout, with an eleven-minute controller deadline. The VM is destroyed after each attempt.
- Transient failures retry with backoff, then enter the DLQ. Its consumer marks exhausted jobs failed; job history and errors remain in `analysis_jobs`. Recount creates a new task.
- `/api/callback/matthew` returns `410`. Old analyses in progress at cutover must be recounted from the dashboard. Historical completed stats remain available.

Matthew validates snapshot size through the Git Trees API for the pinned SHA, sums every blob path, and falls back to non-recursive traversal when GitHub truncates a recursive response. It fetches only that commit at depth one and skips LFS smudging, submodules and symlink targets. See [Matthew's stdio protocol](https://github.com/lingrottin/matthew/blob/main/app/API.md).

</details>
