# 小墨账本

一个纯前端的个人记账应用。数据不在各自浏览器里，而是存在 **GitHub 仓库的 `data.json`** 中，
所以任何人打开网址看到的都是同一份账本，你记一笔、改一笔，别人刷新就能看到。

## 特性

- 多账本管理，支持自定义账本图标
- 支出 / 收入记账，内置常用分类与图标
- 按日、按月查看收支与统计
- 纯静态前端，零构建、零依赖，可直接托管在 GitHub Pages
- 云端共享：数据存在仓库里，多人访问看到同一份

## 工作原理

```
浏览器 ──读取──> raw.githubusercontent.com/…/data.json   （公开，无需鉴权）
   │
   └──写入──> api.github.com/repos/…/contents/data.json  （需要 Token）
                        │
                        └──> 提交到仓库，触发 Pages 重新部署
```

- **读**：走 `raw.githubusercontent.com`，任何人都能读，加时间戳参数拿到最新版本。
- **写**：走 GitHub Contents API，需要写入凭证；每次保存会产生一条提交记录。
- 保存有 500 毫秒防抖，连续操作会合并成一次提交。
- 写入前先取文件 `sha`，遇到 409 冲突会自动重取并重试一次（多人同时改时最后一次为准）。
- 数据同时写了一份到 localStorage 作为离线缓存；写入失败时会保留在本地并提示。

## 部署前必须配置

打开 `js/config.js`，改这两处：

```js
owner: '你的GitHub用户名',
repo: 'my-ledger',
```

### 生成写入凭证

1. 打开 <https://github.com/settings/personal-access-tokens/new>
2. **Repository access** 选 `Only select repositories` → 只勾这一个仓库
3. **Permissions → Repository permissions → Contents** 设为 `Read and write`
4. 有效期建议 1 年，生成后复制 `github_pat_…`
5. 转成 Base64（PowerShell 里执行）：

```powershell
[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes("github_pat_粘贴你的"))
```

6. 把结果填进 `js/config.js` 的 `tokenB64`

> 为什么要 Base64：公开仓库里的明文 Token 会被 GitHub 密钥扫描自动吊销，网站会某天突然存不进数据。
> Base64 **不是加密**，任何人解码都能拿到，所以务必只给它这一个仓库的 Contents 权限。
> 不填 `tokenB64` 时网站仍可正常浏览，但任何修改都只存在本地，别人看不到。

### 迁移你在本机的旧数据

数据存在浏览器 localStorage 里，换域名（从 `localhost` 到 `github.io`）不会自动带过去，需要手动搬一次：

1. 打开旧地址（比如 `http://localhost:8080`）
2. 按 F12 打开控制台，执行 `copy(localStorage.getItem('cat-ledger-v1'))`
3. 打开 `https://github.com/你的用户名/my-ledger/blob/main/data.json` → 编辑 → 全选粘贴 → 提交

下次打开线上版本，就会读到你的真实数据。或者更省事：在新站第一次打开时，
如果线上还是模板数据、而本机已经有正式数据，应用会自动把本机数据推上去。

## 本地运行

直接双击 `index.html`，或起一个静态服务（需要 Node.js）：

```bash
node server.js
# http://localhost:8080
```

注意：`file://` 或 `localhost` 与线上是不同域名，localStorage 互不相通。

## 目录结构

```
index.html      入口页面
data.json       账本数据（线上唯一数据源）
css/style.css   样式
js/config.js    部署配置：仓库地址 + 写入凭证
js/util.js      工具函数
js/icons.js     图标
js/store.js     数据层：远程读写 + 本地缓存
js/pages.js     页面渲染
js/app.js       应用逻辑
server.js       本地预览用静态服务器（仅开发时使用）
```

## 数据与安全须知

- **账本内容是公开的**：仓库是公开的，`data.json` 任何人可读，看得见你每一笔金额、分类和备注。
- **写权限也是公开的**：Token 就在前端代码里，拿到网址的人都能改这份账本。只适合「可信的几个人共用」。
- **没有账号隔离**：所有人看到、改的都是同一份账本，不存在「各看各的」。
- 如果哪天不想公开了，把仓库设为 Private —— 但免费账号的 Pages 会随之失效，需要换其他托管方式。
- 建议定期在仓库里下载 `data.json` 做备份（提交历史本身就是备份，可以随时回滚）。

## 已知限制

- 多人同时编辑时以最后一次保存为准，先保存的内容可能被覆盖。
- 每次保存是一条提交，频繁记账会让提交历史变长。
- 别人看到的更新有约 10~30 秒延迟（CDN 缓存）。

## 部署

推送到 `main` 分支后，在仓库 **Settings → Pages** 中把 Source 设为
`Deploy from a branch` → `main` → `/ (root)`。
