# Cloudflare Update Check

桌面端在启动时调用 `/api/update-check`，并只在设置页底部展示结果。最新版本元数据存放在 Cloudflare D1 的 `app_releases` 表中。

## 查询键

- `app_id`: `drink-water`
- `platform`: `desktop-windows`
- `channel`: `stable`

客户端版本来自应用构建；服务端 `latest_version` 来自 D1。两者不会随 Git tag、GitHub Release 或 Worker 部署自动同步。

## 发布时更新元数据

先把下面的占位符替换为真实版本、说明和绝对 UTC 时间，再执行：

```powershell
corepack pnpm exec wrangler d1 execute drink-water-leaderboard --remote --command "UPDATE app_releases SET latest_version='<NEXT_VERSION>', release_url='https://github.com/zhufree/drink-water/releases', notes='<RELEASE_NOTES>', published_at='<UTC_ISO_TIMESTAMP>', updated_at='<UTC_ISO_TIMESTAMP>' WHERE app_id='drink-water' AND platform='desktop-windows' AND channel='stable';" --config cloudflare/wrangler.jsonc
```

版本号必须是 `x.y.z`。发布说明包含单引号时先正确转义，避免破坏 SQL。

## 验证

更新后分别确认：

1. GitHub Release/安装包已经可用，而不只是 tag 存在。
2. `/api/update-check?appId=drink-water&platform=desktop-windows&channel=stable&currentVersion=<CURRENT_VERSION>` 返回预期 `latestVersion`、`releaseUrl` 和 `publishedAt`。
3. 旧版客户端收到 `hasUpdate: true`，当前版收到 `hasUpdate: false`。

更新 D1 元数据不等于桌面安装包已经发布，也不等于 Worker 已重新部署。
