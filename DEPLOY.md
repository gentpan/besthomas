# 部署

线上地址：https://besthomas.com （后台 https://besthomas.com/admin）

## 线上环境

| 项目 | 位置 |
| --- | --- |
| 服务器 | 一台 Debian 服务器，地址和 SSH 密钥写在本地 `.env.deploy`（不进 git） |
| 程序 | `/opt/besthomas/app`（Next.js standalone），systemd 服务 `besthomas`，监听 `127.0.0.1:3100`，以 `besthomas` 用户运行 |
| 内容 | `/var/lib/besthomas`（文章、图片、站点设置、点赞数、通行密钥）——**备份这个目录就够了** |
| 配置 | `/etc/besthomas.env`（管理员密码、`SITE_URL`）；本地副本在 `.env.server`（不进 git） |
| HTTPS | 服务器上已有的 FrankenPHP（Caddy）负责，站点配置 `/etc/frankenphp/sites/besthomas.com.caddy`（源文件 `deploy/besthomas.com.caddy`），证书由 Let's Encrypt 自动签发和续期 |
| CDN | 域名在 Cloudflare，开着代理（橙色云朵），SSL 模式 Full |

服务器上可能还有其他站点。部署脚本只改 besthomas 自己的文件；加站点配置前会先校验整个 FrankenPHP 配置，校验不过就自动回滚，不影响其他站点。

## 第一次使用部署脚本

在项目根目录创建 `.env.deploy`：

```bash
DEPLOY_HOST=root@你的服务器IP
DEPLOY_KEY=/Users/你/.ssh/你的密钥.pem
```

服务器需要已安装 Node.js 20.9+、rsync，以及运行中的 FrankenPHP（或 Caddy，站点目录 `/etc/frankenphp/sites/`）。第一次部署时会自动创建运行用户、内容目录、`/etc/besthomas.env`（随机生成管理员密码）和 systemd 服务。

## 更新网站（改了代码之后）

```bash
deploy/deploy.sh
```

脚本会：上传代码 → 在服务器上 `npm ci` 并从头构建 → 切换到新版本并重启 → 确认服务正常后再刷新 FrankenPHP 配置。文章和图片不受影响。上一个版本保留在 `/opt/besthomas/app.old`。

## 常用命令（在服务器上）

```bash
systemctl status besthomas            # 运行状态
journalctl -u besthomas -n 100        # 程序日志
tail -f /var/log/frankenphp/besthomas.com.access.log
tar czf besthomas-$(date +%F).tar.gz -C /var/lib besthomas   # 备份内容
```

## 修改管理员密码

编辑服务器上的 `/etc/besthomas.env` 里的 `ADMIN_PASSWORD`，然后 `systemctl restart besthomas`。改密码会让所有已登录的设备退出。记得同步更新本地 `.env.server`。

## 注意

- 访客真实 IP 来自 Cloudflare 的 `CF-Connecting-IP`，只在请求确实来自 Cloudflare 的 IP 段时才采信（见 `deploy/besthomas.com.caddy`）。
- Cloudflare 免费版单个请求最大 100 MB，所以上传的视频也不要超过这个大小。
- 登录接口有防暴力破解：同一 IP 15 分钟内最多试 10 次。
