# Ferris.love

## 开始之前

在部署之前，需要完成下面的工作。

### 环境变量

将以下内容写入环境变量（典型地是 .dev.vars 文件）

```
NEXTJS_ENV=development
AUTH_SECRET="" # Added by `npx auth`. Read more: https://cli.authjs.dev
AUTH_GITHUB_ID= # GitHub 应用的 ID
AUTH_GITHUB_SECRET= # GitHub 应用的密钥
AUTH_TRUST_HOST=true
AUTH_URL=https://development.ferris.love/api/auth # GitHub 登录时的 callback URL

# 以上都由 Next Auth 处理

GITHUB_APP_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----" # 作为 GitHub app 请求 API 所用的私钥
GITHUB_APP_NAME=ferris-love-development
GITHUB_APP_ID=2122542
MATTHEW_URL=http://127.0.0.1:7373 # Matthew 后端的部署 URL
```


### 数据库迁移

Next Auth 会自行管理自己的数据库，所以只用迁移 Ferris.love 自身的逻辑即可。

```
wrangler d1 migrations apply db_drizzle
```

## 启动开发

```
pnpm dev
```