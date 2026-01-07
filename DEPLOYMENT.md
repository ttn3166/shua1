# 部署说明（Ubuntu + Nginx + PM2 + SQLite）

## 1. 服务器准备

```bash
sudo apt update
sudo apt install -y nginx sqlite3 git
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

## 2. 目录规划

建议目录：

```bash
sudo mkdir -p /opt/shua1
sudo chown -R $USER:$USER /opt/shua1
```

`/opt/shua1/uploads` 用于图片/素材静态访问，`/opt/shua1/data/app.db` 为 SQLite 数据库。

## 3. 代码部署

```bash
git clone <YOUR_REPO_URL> /opt/shua1
cd /opt/shua1
npm install --production
npm run migrate
```

## 4. 初始化管理员账号

```bash
INIT_ADMIN_USERNAME=admin INIT_ADMIN_PASSWORD='ChangeMe123!' npm run init:admin
```

> 请立即更换密码，并将 `INIT_ADMIN_PASSWORD` 写入安全的密码管理工具。

## 5. PM2 常驻

```bash
pm2 startOrReload ecosystem.config.js
pm2 save
pm2 startup
```

## 6. Nginx 配置示例

> 按需替换域名与路径。

```nginx
server {
  listen 80;
  server_name example.com;

  root /opt/shua1;

  location /api/ {
    proxy_pass http://127.0.0.1:3000/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }

  location / {
    try_files $uri $uri/ /index.html;
  }

  location = /admin.html {
    try_files $uri /admin.html;
  }

  location /uploads/ {
    alias /opt/shua1/uploads/;
    autoindex off;
  }
}
```

应用配置：

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## 7. GitHub Actions 自动部署

工作流位于 `.github/workflows/deploy.yml`，合并到 `main` 后自动部署，需配置以下 Secrets：

- `DEPLOY_HOST`
- `DEPLOY_USER`
- `DEPLOY_SSH_KEY`
- `DEPLOY_PORT`（可选，默认 22）

部署脚本会执行：拉取最新代码、安装依赖、执行迁移、重启 PM2。

## 8. 数据库迁移

迁移脚本：

```bash
npm run migrate
```

默认数据库路径：`/opt/shua1/data/app.db`。如需自定义：设置 `DB_PATH` 环境变量。

## 9. 上传素材

上传接口：`POST /api/uploads`（FormData，字段名 `file`）。
成功后返回 `/uploads/<filename>`，可直接被 Nginx 静态访问。

## 10. 安全配置清单

- 强制 `/admin.html` 登录（推荐 Nginx 层加 IP 白名单）。
- 环境变量 `JWT_SECRET` 必须替换。
- 上传目录 `uploads` 不可执行，仅允许图片格式。
- 关键操作均需 `reason` 字段并写入审计日志。
- 后台登录失败次数限制（15 分钟内 5 次）与登录日志记录已启用。
- 任务模板/任务分配支持金额占比区间与幸运订单奖励配置（任务相关接口：`/api/tasks/*`）。
- 订单素材上传入口：`POST /api/order-uploads`（先用 `/api/uploads` 上传图片获取 URL）。
- 语言列表：`GET /api/users/meta/languages`，用户可通过 `POST /api/users/me/language` 自主切换语言。
 codex/setup-complete-system-on-ubuntu
- 后台登录入口：`/admin-login.html`，登录后进入 `http://185.39.31.27/admin.html`。

## 11. 避免线上冲突的部署流程建议

1. 线上目录仅允许 CI/CD 更新代码，禁止手动修改文件。
2. 如需临时修复：在 Git 分支提交后合并进 `main`，触发 GitHub Actions 部署。
3. 所有环境变量（如 `JWT_SECRET`、`DB_PATH`）通过系统服务或 `.env` 管理，不进代码库。
