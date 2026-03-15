# VPS Status Cloudflare Worker 图形化部署完全指南（中文版）

本文面向通过 Cloudflare 控制台（图形化界面）部署的用户，尽量不依赖本地 CLI。

适用仓库：`vps-status`（当前项目）

## 1. 先理解这个项目的部署要求

根据当前代码，部署成功必须满足以下条件：

1. 这是一个 **Cloudflare Worker** 项目，入口为 `src/index.ts`。
2. 必须绑定一个 **D1 数据库**，绑定变量名必须是 `DB`。
3. 必须配置密钥 `JWT_SECRET`，否则登录相关 API 会报错。
4. 网站监控依赖 `scheduled()`，默认 Cron 为 `* * * * *`（每分钟执行）。
5. 首次管理员可以在页面初始化，也可以通过环境变量预置。

## 2. 部署前准备（纯图形化也建议做）

1. 将本项目放到 GitHub 或 GitLab 仓库（建议 fork 后用你自己的仓库）。
2. 打开仓库里的 `wrangler.toml`，至少确认下面两项：

```toml
name = "vps-status"

[[ d1_databases ]]
binding = "DB"
database_name = "vps-monitor-db"
database_id = "YOUR_DATABASE_ID_HERE"
```

3. `database_id` 不能保留占位符，必须替换为你的真实 D1 Database ID（后续第 4 节会教怎么拿）。
4. 如果你要改 Worker 名字，`wrangler.toml` 的 `name` 要和 Cloudflare 上的 Worker 名一致，否则构建会失败。

## 3. 在 Cloudflare 控制台导入仓库并创建 Worker

1. 进入 Cloudflare Dashboard。
2. 打开 `Workers & Pages`。
3. 点击 `Create application`。
4. 选择 `Import a repository`。
5. 连接你的 GitHub/GitLab，并选中本项目仓库。
6. Build 配置建议：
7. `Root directory` 填 `/`。
8. `Build command` 填 `npm run build`（用于提前做 TypeScript 检查）。
9. `Deploy command` 填 `npm run deploy`。
10. 点击 `Save and Deploy`。

说明：本项目已有 `package.json` 的 deploy 脚本（`wrangler deploy`），可以直接使用。

## 4. 在 Cloudflare 创建 D1，并绑定到 Worker

### 4.1 创建 D1 数据库（控制台）

1. 进入 Cloudflare 的 D1 页面（`D1 SQL database`）。
2. 点击 `Create Database`。
3. 数据库命名建议与仓库一致，比如 `vps-monitor-db`。
4. 创建后，复制该数据库的 `Database ID`（UUID）。

### 4.2 回填 `wrangler.toml`

1. 回到你的 Git 仓库，把 `wrangler.toml` 中的 `database_id` 改为真实 UUID。
2. 提交并推送到部署分支（比如 `main`）。
3. Cloudflare 会自动触发新一轮构建部署。

### 4.3 在 Worker 控制台确认 Binding

1. 进入 `Workers & Pages` -> 你的 Worker。
2. 打开 `Bindings`。
3. 添加（或确认已有）D1 绑定：
4. 类型选择 D1。
5. 变量名必须是 `DB`。
6. 选择你刚创建的数据库。

## 5. 配置环境变量和密钥（必须）

进入 `Worker -> Settings -> Variables and Secrets`，添加以下项：

1. `JWT_SECRET`（必填，建议使用高强度随机字符串，类型选 Secret）。
2. `USERNAME`（可选，预置管理员用户名）。
3. `PASSWORD`（可选，预置管理员密码）。
4. `ALLOWED_ORIGINS`（可选，逗号分隔，如 `https://a.com,https://b.com`）。

保存后点击 `Deploy` 使其生效。

建议：

1. 生产环境一定要用 Secret 存放 `JWT_SECRET` 和 `PASSWORD`。
2. 如果你不想预置管理员，`USERNAME/PASSWORD` 不设置即可，首次访问 `/login` 会走初始化流程。

## 6. 配置 Cron（网站监控定时任务）

本项目默认表达式是每分钟一次：

```toml
[triggers]
crons = ["* * * * *"]
```

你可以在以下位置确认：

1. `Worker -> Settings -> Triggers -> Cron Triggers`。
2. 有 `* * * * *` 即可。

注意：如果继续用 `wrangler deploy`（本项目就是），后续部署可能会以 `wrangler.toml` 为准覆盖手工改动，所以建议以仓库配置为主。

## 7. 首次上线初始化

部署完成后，用你的 Worker 地址执行下面流程（`<your-worker-url>` 例如 `https://vps-status.xxx.workers.dev`）：

1. 初始化数据库（推荐执行一次）  
`GET https://<your-worker-url>/api/init-db`
2. 打开登录页  
`https://<your-worker-url>/login`
3. 若未创建管理员，页面会自动进入首次初始化，按提示创建账号。

## 8. 业务功能启用步骤

### 8.1 添加站点监控

1. 登录管理后台：`https://<your-worker-url>/admin`。
2. 添加站点 URL（必须是 `http://` 或 `https://` 开头）。
3. 添加后会立即检测一次，之后由 Cron 周期检测。

### 8.2 添加 VPS 监控

1. 在管理后台添加服务器。
2. 在目标 Ubuntu 机器上执行安装命令：

```bash
curl -sL https://<your-worker-url>/install.sh | bash -s -- \
  -k <FULL_API_KEY> \
  -s <SERVER_ID> \
  -u https://<your-worker-url>
```

3. 常用排查命令：

```bash
systemctl status vps-status
systemctl restart vps-status
journalctl -u vps-status -f
```

## 9. 验收清单（上线后逐项检查）

1. 打开 `/` 页面能看到前台状态页。
2. 打开 `/login` 可以登录或初始化管理员。
3. `/api/auth/status` 返回正常 JSON。
4. 新增站点后，`/api/sites/status` 有数据。
5. VPS 安装 agent 后，`/api/status/batch` 有对应指标。
6. Cron 触发后，站点状态会持续更新（可在 Worker 的 Trigger Events/Logs 中确认）。

## 10. 常见问题与解决

1. 构建失败，提示 Worker 名称不匹配  
检查 Cloudflare Worker 名称与 `wrangler.toml` 的 `name` 是否一致。
2. 构建失败，D1 配置报错  
检查 `wrangler.toml` 里的 `database_id` 是否还是占位符，或不是合法 UUID。
3. 登录/鉴权报 500 或配置错误  
检查 `JWT_SECRET` 是否已设置并已重新 Deploy。
4. 接口报 `no such table`  
先访问 `/api/init-db`，并确认 D1 绑定变量名是 `DB`。
5. 站点监控不执行  
确认 Cron Trigger 已存在，表达式正确，且等待几分钟后查看 Logs/Trigger Events。
6. 跨域请求失败  
设置 `ALLOWED_ORIGINS`，多个域名用逗号分隔。

## 11. 版本更新与回滚（图形化）

1. 代码更新：推送 Git 提交，Cloudflare 自动构建部署。
2. 版本回滚：Worker 页面进入 `Deployments`，选择旧版本重新部署。

## 12. 安全建议（生产必做）

1. `JWT_SECRET` 使用随机高强度值，不要复用。
2. 服务器 API Key 不要通过聊天工具明文传播。
3. 只在需要时设置 `USERNAME/PASSWORD` 预置账号；完成初始化后建议移除，减少误配置风险。
4. 关注 Worker Logs 与 D1 使用量，定期检查异常请求。
