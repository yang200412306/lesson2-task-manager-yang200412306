# 练习二：智能任务管理系统（Node.js + Express + Supabase）

真正能存数据的任务管理系统：浏览器页面操作 → Express 接口 → Supabase 云端数据库。放到任意一台有公网 IP 的服务器上后，你和同学在不同设备上看到的就是同一份任务数据。

![界面预览](界面预览.png)

## 一、项目结构

```
task-manager/
├── server.js            启动入口
├── app.js               Express 应用：托管页面 + 4 个任务接口
├── config.js            配置（读环境变量，也可直接把密钥填在这里）
├── lib/db.js            Supabase 客户端（懒加载 + 配置校验）
├── public/
│   ├── index.html       页面结构
│   ├── style.css        样式（响应式，手机也好看）
│   └── app.js           前端逻辑（增删改查 + 筛选 + 统计）
├── supabase/schema.sql  建表 SQL + RLS 策略（第 2 步要在 Supabase 里执行）
├── 界面预览.png          页面效果图
├── .env.example         密钥模板（复制成 .env 使用，.env 不进 Git）
├── .gitignore
└── README.md
```

## 二、创建数据表（⭐关键环节）

1. 打开 <https://supabase.com> → Sign Up（可用 GitHub 账号登录）→ New Project。
2. Name 填 `task-manager-你的拼音`，Database Password 点 Generate 后复制保存，Region 选 **Singapore**，等待约 2 分钟。
3. 左侧 **SQL Editor** → **New query** → 把 `supabase/schema.sql` 全文粘贴 → **Run**。
4. 出现 `Success. No rows returned` 即成功。

✅ **验证**：左侧 **Table Editor** 里能看到 `tasks` 表，字段为 `id / title / priority / completed / created_at`。
`schema.sql` 同时做了两件事：建表 + 开启 RLS 并放行匿名读写。**只建表不执行策略**，页面会报 `row-level security` 错误。

## 三、填入密钥（⭐关键环节）

Supabase 项目页 → 左下 **Project Settings**（齿轮）→ **API**，复制两项：

- **Project URL**：`https://xxxx.supabase.co`
- **anon public key**：`eyJ` 开头的一长串

在项目根目录：

```powershell
Copy-Item .env.example .env
notepad .env
```

把 `.env` 里两行替换成你自己的值（等号后不要加引号和空格）：

```
SUPABASE_URL=https://abcd1234.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOi...
```

> 不想用 `.env` 也可以直接改 `config.js` 第 6、7 行的兜底值，但**不要**把含真实密钥的文件提交到 GitHub。

## 四、本地跑起来

```bash
node -v                 # 需要 Node.js 20 及以上
npm install             # 装依赖：express + @supabase/supabase-js
npm start               # 等价于 node --env-file-if-exists=.env server.js
```

浏览器打开 <http://localhost:3000>，状态灯变绿、显示“已连接”即成功。

**本地自测清单**：

- [ ] 输入标题 + 选优先级 → 添加任务 → 列表顶部出现新任务
- [ ] 点左侧方框 → 标题加删除线，完成数和完成率变化
- [ ] 切换“高/中/低”筛选 → 列表只剩对应优先级
- [ ] 删除任务 → 弹确认 → 消失
- [ ] 刷新页面、甚至重启服务 → 任务还在（说明真的存进数据库了）
- [ ] 手机连同一 WiFi 访问 `http://电脑IP:3000` → 看到同一批任务

## 五、接口说明（答辩/报告可以直接引用）

| 方法 | 路径 | 作用 | 请求体 / 参数 |
| --- | --- | --- | --- |
| GET | `/api/health` | 健康检查，返回是否已配置数据库 | — |
| GET | `/api/tasks` | 任务列表，按 `created_at` 倒序 | `?priority=高`（可选，全部/高/中/低） |
| POST | `/api/tasks` | 新增任务 | `{ "title": "写实训报告", "priority": "高" }` |
| PATCH | `/api/tasks/:id` | 更新任务（切换完成、改标题、改优先级） | `{ "completed": true }` |
| DELETE | `/api/tasks/:id` | 删除任务 | — |

前端不直接连数据库，所有读写都经过 Express，这样密钥只留在服务端（`.env`），页面代码里看不到。想看接口效果可以直接在浏览器打开 <http://localhost:3000/api/tasks>。

## 六、推送到 GitHub

1. GitHub → `+` → **New repository** → 仓库名 `task-manager-你的拼音` → **Public** → **不要**勾选 Add a README（本地已有）→ Create repository。
2. 在项目根目录执行：

```bash
git init
git add .
git commit -m "练习二：智能任务管理系统首次提交"
git branch -M main
git remote add origin https://github.com/你的用户名/task-manager-你的拼音.git
git push -u origin main
```

✅ 检查：GitHub 页面上有 `app.js`、`public/`、`supabase/`，**没有** `.env` 和 `node_modules/`（`.gitignore` 已挡住）。

## 七、部署上线（⭐公网可用）

数据库本来就在 Supabase 云端，所以服务器上**不需要装数据库**，只要能把 Node 进程跑起来。

| 方式 | 适合场景 | 成本 | 地址形式 |
| --- | --- | --- | --- |
| **A. 云服务器 + pm2**（推荐） | 课程要交公网网址、要稳定 | 轻量服务器约 24–60 元/月 | `http://服务器IP:3000` 或 `http://你的域名` |
| B. 托管平台（Render / Railway / Zeabur） | 不想买服务器 | 免费额度 | `https://xxx.onrender.com` |
| C. 内网穿透（cpolar / ngrok） | 临时演示 | 免费版够用 | `https://随机子域名.xxx.com` |

### A. 云服务器（Ubuntu 为例）

1. 买一台轻量应用服务器（1 核 1G 够用），系统选 **Ubuntu 22.04/24.04**；控制台**安全组/防火墙**放行 `3000`（用 nginx 走 80 的话放行 `80`）。
2. 装 Node.js：

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs git
node -v
```

3. 拉代码并装依赖：

```bash
git clone https://github.com/你的用户名/task-manager-你的拼音.git
cd task-manager-你的拼音
npm install
```

4. **在服务器上单独建 `.env`**（不要从本地把含密钥的文件传上去，也不要提交到 Git）：

```bash
cp .env.example .env
nano .env      # 填入 SUPABASE_URL 和 SUPABASE_ANON_KEY，Ctrl+O 保存、Ctrl+X 退出
```

5. 先手动试跑，确认接口通：

```bash
npm start      # 另开一个 SSH 窗口：curl http://localhost:3000/api/health
```

看到 `"supabaseConfigured":true` 就说明服务器已经连上你的 Supabase 了。

6. 用 pm2 常驻（关掉 SSH 也不停）：

```bash
sudo npm install -g pm2
pm2 start npm --name task-manager -- start
pm2 save
pm2 startup     # 按提示复制执行它给出的那行 sudo 命令，实现开机自启
```

> 以后改了代码要 `pm2 restart task-manager`；改了 `.env` 也必须 restart 才生效（`pm2 restart task-manager --update-env`）。

7. 浏览器访问 `http://服务器公网IP:3000`，添加一条任务再刷新，数据还在就成功了。

> **去掉 `:3000` 端口号 / 用域名**：装 nginx（`sudo apt install -y nginx`），把 `/etc/nginx/sites-available/default` 里的 `location /` 改成 `proxy_pass http://127.0.0.1:3000;`，然后 `sudo nginx -t && sudo systemctl reload nginx`。域名在控制台加一条 **A 记录**指向服务器 IP，等 10 分钟生效。

### B. 托管平台（Render / Railway / Zeabur 通用）

1. 用 GitHub 登录平台 → New **Web Service** → 选 `task-manager-xxx` 仓库。
2. Build Command 填 `npm install`，Start Command 填 `npm start`（`server.js` 已读 `process.env.PORT`，平台注入的端口能直接用）。
3. 在平台的 **Environment Variables** 里加两条：`SUPABASE_URL`、`SUPABASE_ANON_KEY`。
4. 部署完成得到 `https://xxx.onrender.com`。免费实例闲置会休眠，首次访问等十几秒。

### C. 内网穿透（临时演示）

```powershell
cpolar http 3000
```

拿到 `https://xxxx.cpolar.top` 就能发给老师；要求电脑一直开着，免费版地址会变。

✅ **验收标准**：把公网地址发到手机或同桌，双方各自添加任务，刷新后都能看到对方加的数据。

## 八、常见问题（把报错原文贴回 AI 是最快的办法）

| 现象 | 原因 | 处理 |
| --- | --- | --- |
| 页面顶部黄条“还没有配置数据库” | `.env` 没建或变量名写错 | 确认文件叫 `.env`（不是 `.env.txt`），变量名为 `SUPABASE_URL` / `SUPABASE_ANON_KEY`，改完重启服务 |
| 状态灯红、提示“数据表 tasks 不存在” | 没执行建表 SQL | 回 Supabase → SQL Editor 执行 `supabase/schema.sql` |
| 提示 `row-level security` | 开了 RLS 但没建策略 | 再执行 `schema.sql` 最后那段 policy，或让 AI 给“允许匿名读写的 RLS 策略 SQL” |
| 提示“Supabase 密钥无效” | 复制错了 key（比如复制了 service_role） | 重新复制 **anon public** key，长度约 200+ 字符 |
| 连不上 Supabase / fetch failed | 网络受限或 URL 写错 | 校园网换手机热点试；确认 URL 是 `https://xxx.supabase.co` 且没有多余斜杠 |
| 服务器上 `curl localhost:3000` 正常，外面打不开 | 安全组/防火墙没放行端口 | 云控制台放行 3000（或走 nginx 用 80） |
| 服务器上页面黄条“还没配置数据库” | 服务器上没有建 `.env`，或改了没重启 | 在服务器 `cp .env.example .env` 填好后 `pm2 restart task-manager` |
| 关掉 SSH 后网站打不开 | 进程跟着会话退出 | 用 pm2 启动并 `pm2 save` |
| 两台设备数据不同步 | 一边开了缓存或访问的是不同地址 | 强制刷新 Ctrl+F5；确认两边用的是同一个公网地址 |

## 九、提交清单（练习二验收）

- [ ] Supabase 项目名：`task-manager-xxx`，`tasks` 表可见
- [ ] GitHub 仓库地址：`https://github.com/你的用户名/task-manager-xxx`
- [ ] 公网地址：`http://服务器IP:3000`、`https://xxx.onrender.com` 或 `https://xxx.cpolar.top`
- [ ] 一句心得：你向 AI 提问了几次？改了哪些提示词？（例：第一次没说“中文界面”，AI 给了英文页面，追问后重做）

## 十、拓展挑战（可选加分）

1. **密钥不进代码库**：本项目已经是标准做法（`.env` 只放服务器本地 + `.gitignore` 排除），报告中可作为亮点写。
2. **美化**：加深色模式（CSS 变量 + `prefers-color-scheme`）、任务统计图表（总任务/完成数/完成率已内置，可再加趋势图）。
3. **账号系统**：接 Supabase Auth，把 RLS 策略从 `using (true)` 改成 `using (auth.uid() = user_id)`，并给 `tasks` 加 `user_id` 字段——这一步做完就是正经的多用户应用。

