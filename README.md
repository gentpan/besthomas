# besthomas

个人网站 [besthomas.com](https://besthomas.com) 的源码，中英双语。

- 前台：中文版在 `/`，英文版在 `/en`。首页（名字、简介、文章列表）和文章页，右上角一键切换语言，自带深色模式和手机适配。
- 文章点赞：匿名点赞，不需要登录，没有评论。
- 后台 `/admin`：上传 Markdown 自动识别语言 / 标题 / 日期 / slug，在线编辑、实时预览、上传图片，分别设置中英文首页信息。可以用密码或通行密钥（Passkey）登录。
- 没有分类和标签，文章按日期倒序排列。
- 不需要数据库，所有内容都在 `data/` 文件夹里，备份就是复制这个文件夹：

```
data/
  posts/zh/<slug>.md   中文文章
  posts/en/<slug>.md   英文文章（和中文用同一个 slug 就是互为译文）
  uploads/             上传的图片和视频
  site.json            首页名字、简介、页脚链接
  likes.json           点赞数
  passkeys.json        后台登录用的通行密钥（只有公钥）
```

## 本地开发

```bash
npm install
cp .env.example .env.local   # 然后改 ADMIN_PASSWORD
npm run dev
```

打开 http://localhost:3000 ，后台在 http://localhost:3000/admin 。第一次启动会自动生成 `data/` 和一对中英文示例文章。

如果改了代码但页面没变化，停掉 `npm run dev` 再重新启动即可。

## 中英双语怎么用

- 每篇文章属于一种语言。中文文章地址是 `/slug`，英文是 `/en/slug`。
- 中英两篇用同一个 slug，就会互相关联：读者在文章页点右上角的 EN / 中文，会直接跳到对应译文；没有译文时跳到另一种语言的首页。
- 后台文章列表里，每篇文章旁边有"↔ English版"（已有译文）或"+ English版"（点击新建译文，slug 自动填好）。

## 上传 Markdown 时怎么识别

| 字段 | 识别顺序 |
| --- | --- |
| 语言 | front matter 的 `lang` / `language` → 文件名后缀 `xxx.en.md` / `xxx.zh.md` → 正文里中文字多还是英文单词多 |
| 标题 | front matter 的 `title` → 正文第一行 `# 标题`（会从正文里去掉，避免重复）→ 文件名 |
| 日期 | front matter 的 `date` / `pubDate` / `created` 等 → 文件名开头的 `2025-03-08-` → 今天 |
| slug | front matter 的 `slug` / `permalink` → 英文文件名 → 标题（中文自动转拼音）；同语言里重名会自动加 `-2` |
| 摘要 | front matter 的 `summary` / `description`，没有就在页面上自动取正文第一段 |
| 草稿 | `draft: true`、`published: false` 或 `status: draft` |

- 支持 Hexo、Hugo、Jekyll、Obsidian、Notion 导出的 .md（`tags`、`categories` 会被忽略）。
- 文章里引用的本地图片（`![](./img/a.png)`、`![[a.png]]`、`<img src>`）：把图片和 .md 一起拖进去，会按文件名自动换成上传后的地址。
- slug 只能用小写字母、数字和 `-`，保存前可以随意改；改 slug 会让旧链接失效（点赞数会跟着文章走）。

## 点赞

- 每篇文章底部一个心形按钮，再点一次取消。浏览器会记住自己点过哪些。
- 防刷：同一个 IP 对同一篇文章一天最多操作 20 次。
- 点赞数在后台文章列表里显示（♥）。

## 通行密钥（Passkey）登录

- 先用密码登录后台，到「站点设置」最下面点「添加通行密钥」，按提示用指纹 / 面容 / 设备密码确认即可。
- 之后登录页会出现「使用通行密钥登录」。iCloud 钥匙串、Google 密码管理器里的通行密钥会自动同步到同账号的其他设备。
- 通行密钥绑定域名：线上添加的只能在 besthomas.com 用，本地开发（localhost）要另外添加。
- 密码登录仍然保留，作为备用。

## 分享预览图（Open Graph）

- 链接分享到 X、微信、Telegram 等地方时显示的大图，自动生成，不用手动做：网格纸上一张倾斜的白纸，首页印网站名，文章页印「网站名 + 文章标题」，中英文都有。
- 改了网站名或文章标题，预览图会跟着变。X 等平台会缓存预览图，已经分享过的链接可能要过一阵才更新。
- 样式在 `src/lib/og.tsx`。

## 部署

见 [DEPLOY.md](DEPLOY.md)。

## 技术栈

Next.js 16（App Router、Turbopack）· React 19 · Tailwind CSS 4 · unified / remark / rehype + Shiki · SimpleWebAuthn · 字体来自 [Fontsource](https://fontsource.org) 和 [Inter](https://rsms.me/inter/)（均为 OFL 许可）。

## 许可证

[MIT](LICENSE)
