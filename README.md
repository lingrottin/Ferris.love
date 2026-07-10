# Ferris.love

## Development & Deployment

You need to follow the following steps to get Ferris.love to work. (On Cloudflare or your local machine)

1. Deploy [matthew](https://github.com/lingrottin/matthew) as a [Cloudflare Container](https://developers.cloudflare.com/containers/).
    - Build the image: `podman build -t matthew:latest -f Dockerfile .`
    - Push it to the Cloudflare managed registry: `wrangler containers push matthew:latest`
    - The image reference will be shown after pushing (e.g. `registry.cloudflare.com/<account>/matthew:latest`).
    - Update the `image` field in `wrangler.template.jsonc`'s `containers` section.
1. Create the following on your Cloudflare account: *(ignore these if you're running locally)*
    - A [Workers KV](https://developers.cloudflare.com/kv/) named `kvRoot`.
    - Two [D1 databases](https://developers.cloudflare.com/d1/).
    - A [R2 storage](https://developers.cloudflare.com/r2/) bucket named `ferris-love`.
1. Set the environment variables below.

    ```bash
    # CF RESOURCE IDs
    # You can fill in random values (don't need to be UUID) in local development.
    AUTH_DB_ID="abcdefgh-ijkl-mnop-qrst-uvwxyz123456"
    DRIZZLE_DB_ID="abcdefgh-ijkl-mnop-qrst-uvwxyz123456"
    KV_ID="abcdefghijklmnopqrstuvwxyz123456"

    # SECRETS
    AUTH_SECRET="" # Added by `npx auth`. Read more: https://cli.authjs.dev
    AUTH_GITHUB_SECRET="Your GitHub App Client secret"
    GITHUB_APP_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n-----END PRIVATE KEY-----"
    MATTHEW_TOKEN="" # Same as Config.toml of matthew
    MATTHEW_CALLBACK_SECRET="" # Same as Config.toml of matthew

    # NON-SECRET ENVIRONMENT VARS
    AUTH_GITHUB_ID="Your GitHub App Client id"
    AUTH_TRUST_HOST="true"
    AUTH_URL="https://your.domain/api/auth"
    GITHUB_APP_NAME="your-github-app-name"
    GITHUB_APP_ID="Your GitHub app numeric id"
    BASE_URL="https://your.domain"
    ```

    - For deploying to Cloudflare: Just put them in `.env`.
    - For developing locally: You may need to put them both in `.env` and `.dev.vars`. Auth.js somehow looks in the former, but the latter is actually read during the runtime.

1. Run `node scripts/build-config.js`. This creates a `wrangler.jsonc` by filling up placeholders in [`wrangler.template.jsonc`](/wrangler.template.jsonc) with the values in `.env`.

1. Grab and upload those font files to the R2 bucket named "ferris-love":
    - Inter_Regular.ttf
    - Inter_Bold.ttf
    - Inter_Black.ttf
    - AdwaitaMono_Bold.ttf

    The Inter font family is available on [Google Fonts](https://fonts.google.com/specimen/Inter), and the Adwaita font family is available on [GNOME GitLab](https://gitlab.gnome.org/GNOME/adwaita-fonts).

1. You're all set!
    - For deployment, call `pnpm install && pnpm run deploy`.
    - For debugging, call `pnpm dev` to enjoy HMR and then `pnpm preview` to check if it fits the Workers runtime.

> [!IMPORTANT]
> When actually deploying to the Cloud, please set the variables in the `SECRETS` section above as [Secrets](https://developers.cloudflare.com/workers/configuration/secrets/), not plain texts. That can be done by `wrangler versions secret put <KEY>`.
