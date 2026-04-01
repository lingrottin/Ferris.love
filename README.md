# Ferris.love

## Deployment

Before deployment you need to:

1. Deploy [matthew](https://github.com/lingrottin/matthew)
1. Setup a cloudflared on the machine where Matthew runs
1. Create a Workers VPC on that machine, and copy its id
1. Create .env and write the content below:
    ```bash
    MATTHEW_VPC_ID="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxxx"
    ```
1. run `node scripts/build-config.js`
1. let wrangler deploy underlying service on Cloudflare
1. grab and upload those font files to the R2 bucket named "ferris-love":
    - Inter_Regular.ttf
    - Inter_Bold.ttf
    - Inter_Black.ttf
    - AdwaitaMono_Bold.ttf
1. set these environment variables:
    ```bash
    # If you're still in development the set this
    # Load .env.development* files when running `wrangler dev`
    # NEXTJS_ENV=development
    AUTH_SECRET="" # Added by `npx auth`. Read more: https://cli.authjs.dev
    AUTH_GITHUB_ID="Your GitHub App Client id"
    AUTH_GITHUB_SECRET="Your GitHub App Client secret"
    AUTH_TRUST_HOST=true
    AUTH_URL=https://your.domain/api/auth
    GITHUB_APP_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n-----END PRIVATE KEY-----\n"
    GITHUB_APP_NAME="your-github-app-name"
    GITHUB_APP_ID="Your GitHub app numeric id"
    MATTHEW_URL="http://127.0.0.1:3000" # change "127.0.0.1" to the ip addr. relative to where you run Cloudflared
    MATTHEW_TOKEN="" # Same as Config.toml of matthew 
    MATTHEW_CALLBACK_SECRET="" # Same as Config.toml of matthew 
    BASE_URL=https://your.domain
    ```
1. then your app should work