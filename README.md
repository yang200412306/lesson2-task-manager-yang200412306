# 练习二：智能任务管理系统（Node.js + Express，双存储模式）

桌面端项目，两个源目录就能跑：`npm install` 一次，`npm start` 启动，浏览器里就是完整的任务管理界面——添加、完成切换、删除、按优先级筛选、完成率统计。

**存储有两种模式，代码同一份：**

- **本地模式（默认）**：任务写到 `data/tasks.json`，不需要任何云账号，断网也能用，重启不丢数据。
- **云端模式（可选）**：在 `.env` 填好 Supabase 的 URL 和 anon key，自动切到云端，多人多设备共享同一份数据。

![界面预览](界面预览.png)

## 一、项目结构

```
task-manager/
├── server.js            启动入口（npm start 就是跑它）
├── app.js               Express 应用：托管页面 + 4 个任务接口
├── config.js            配置（Supabase 密钥走环境变量）
├── lib/db.js            Supabase 客户端（懒加载 + 配置校验）
├── lib/store.js         存储层：local（JSON 文件）/ supabase 两种实现
├── public/
│   ├── index.html       页面结构
│   ├── style.css        样式（响应式，手机也好看）
│   └── app.js           前端逻辑（增删改查 + 筛选 + 统计 + 30 秒自动同步）
├── data/tasks.json      本地模式的数据文件（首次运行自动生成，不进 Git）
├── supabase/schema.sql  云端模式的建表 SQL + RLS 策略
├── 界面预览.png          页面效果图
├── .env.example         云端模式密钥模板
├── .gitignore
└── README.md
```

## 二、本地跑起来（默认模式）

在项目目录打开终端：

```bash
node -v            # 需要 Node.js 18 以上，推荐 22
npm install        # 装 express + @supabase/supabase-js
npm start          # 等价于 node --env-file-if-exists=.env server.js
```

浏览器打开 <http://localhost:3000>，右上角显示「已连接 · 本地存储 · N 条任务」即成功。
端口被占用时换一个：`$env:PORT=3001; npm start`（PowerShell）。

**自测清单（照着做一遍，全部通过就说明数据链路没问题）：**

- [ ] 输入标题 + 选优先级 → 添加 → 新任务出现在列表顶部
- [ ] 点左侧方框 → 标题加删除线，已完成数和完成率变化
- [ ] 切换「高/中/低」筛选 → 列表只剩对应优先级，顶部计数同步
- [ ] 删除任务 → 弹确认 → 消失
- [ ] 关掉服务再 `npm start`，刷新页面 → 任务还在（数据在 `data/tasks.json` 里）
- [ ] 手机连同一 WiFi 访问 `http://电脑IP:3000` → 看到同一批任务（可能需要放行防火墙，见第六节）

> 数据文件是纯 JSON，可以直接用记事本打开看。想清空就删掉 `data/tasks.json` 再启动。

## 三、切到云端模式（可选）

需要能正常访问 `supabase.com`（部分校园网/家庭网络访问很慢，本地模式不受影响）。

### 3.1 建表（⭐关键环节）

1. <https://supabase.com> → Sign Up（可用 GitHub 登录）→ New Project。
2. Name 填 `task-manager-你的拼音`，Database Password 点 Generate 后复制保存，Region 选 **Singapore**，等约 2 分钟。
3. 左侧 **SQL Editor** → **New query** → 把 `supabase/schema.sql` 全文粘贴 → **Run**。
4. 出现 `Success. No rows returned` 即成功。

✅ 验证：**Table Editor** 里能看到 `tasks` 表，字段 `id / title / priority / completed / created_at`。
`schema.sql` 同时建表并开启 RLS 放行匿名读写；**只建表不执行策略**会报 `row-level security` 错误。

### 3.2 填密钥

Supabase → **Project Settings**（齿轮）→ **API**，复制两项：

- **Project URL**：`https://xxxx.supabase.co`
- **anon public key**：`eyJ` 开头的一长串

在项目根目录建 `.env`（或直接改 `config.js` 里的兜底值）：

```powershell
Copy-Item .env.example .env
notepad .env
```

```
SUPABASE_URL=https://abcd1234.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOi...
```

重启服务（`Ctrl+C` 后重新 `npm start`），页面右上角就会变成「已连接 · 云端存储」，数据开始存进 Supabase。

> 想强制指定模式：`$env:STORAGE="local"` 或 `"supabase"`，方便答辩时切换演示。
> 密钥只放 `.env`，不要写进前端代码，也不要提交到 Git。

## 四、接口说明（答辩/报告可直接引用）

| 方法 | 路径 | 作用 | 请求体 / 参数 |
| --- | --- | --- | --- |
| GET | `/api/health` | 健康检查，返回当前存储模式 | — → `{ ok, storage: "local" \| "supabase" }` |
| GET | `/api/tasks` | 任务列表，按 `created_at` 倒序 | `?priority=高`（可选） |
| POST | `/api/tasks` | 新增任务 | `{ "title": "写实训报告", "priority": "高" }` |
| PATCH | `/api/tasks/:id` | 更新（切换完成 / 改标题 / 改优先级） | `{ "completed": true }` |
| DELETE | `/api/tasks/:id` | 删除任务 | — |

两种模式返回结构完全一致，前端不用改；所以「本地跑通 → 换成云端」只是换存储，接口和页面都不动。可以直接在浏览器打开 <http://localhost:3000/api/tasks> 看 JSON。

## 五、推到 GitHub

1. GitHub → `+` → **New repository** → 仓库名 `task-manager-你的拼音` → **Public** → 不要勾 Add a README → Create。
2. 项目目录执行（换成你的仓库地址）：

```bash
git init
git add .
git commit -m "练习二：智能任务管理系统首次提交"
git branch -M main
git remote add origin https://github.com/你的用户名/task-manager-你的拼音.git
git push -u origin main
```

✅ 检查：仓库里有 `app.js`、`lib/`、`public/`、`supabase/`，**没有** `.env`、`node_modules/`、`data/`（`.gitignore` 已挡住）。

## 六、本地演示 + 手机访问（不用云平台也能验收）

1. 电脑上 `npm start`，浏览器打开 localhost:3000，按第二节清单演示一遍。
2. 查本机 IP：`ipconfig`，找「IPv4 地址」形如 `192.168.x.x` / `10.x.x.x`。
3. 手机连同一个 WiFi，浏览器打开 `http://那个IP:3000`。
4. 手机打不开多半是防火墙。以管理员身份打开 PowerShell 执行一次（放行 3000 端口）：

```powershell
New-NetFirewallRule -DisplayName "task-manager-3000" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow
```

5. 想让多个设备看到**同一份**数据，就需要云端模式（第三节）；本地模式下每台电脑各存各的。

## 七、常见问题（把报错原文贴回 AI 是最快的办法）

| 现象 | 原因 | 处理 |
| --- | --- | --- |
| `npm start` 报 `Cannot find module 'express'` | 没装依赖 | 在项目目录执行 `npm install` |
| `Error: listen EADDRINUSE` | 3000 端口被占用 | `$env:PORT=3001; npm start` |
| 页面显示「本地存储」，但添加后刷新就没了 | 没写权限或目录不对 | 看终端报错；确认项目目录下有 `data/` 且未被安全软件拦截 |
| 改成云端后仍显示「本地存储」 | `.env` 没生效 | 确认文件名为 `.env`、变量名没拼错，改完必须重启服务 |
| 云端提示「数据表 tasks 不存在」 | 没执行建表 SQL | Supabase → SQL Editor 跑 `supabase/schema.sql` |
| 提示 `row-level security` | 开了 RLS 没建策略 | 再执行 `schema.sql` 最后那段 policy |
| 提示「Supabase 密钥无效」 | 复制成了 service_role | 重新复制 **anon public** key |
| 连不上 Supabase / fetch failed | 网络访问不了 supabase.com | 换手机热点试；实在不行就用默认的本地模式，不影响功能验收 |
| 手机打不开局域网地址 | 防火墙拦了 | 按第六节第 4 条放行端口 |

## 八、提交清单（练习二验收）

- [ ] Supabase 项目名（用云端模式时）：`task-manager-xxx`，`tasks` 表可见
- [ ] GitHub 仓库地址：`https://github.com/你的用户名/task-manager-xxx`
- [ ] 本地演示：录屏或现场演示（添加 → 完成 → 筛选 → 删除 → 重启数据还在）
- [ ] 一句心得：向 AI 提问几次？改了哪些提示词？

## 九、拓展挑战（可选加分）

1. **密钥不进代码库**：`.env` + `.gitignore` 已经是标准做法，报告里可当亮点写。
2. **存储可切换**：本项目 `lib/store.js` 用同一套接口封装两种后端，是「依赖倒置」的简单示例，答辩时可以讲。
3. **美化**：加深色模式（CSS 变量 + `prefers-color-scheme`）、完成趋势图。
4. **账号系统**：接 Supabase Auth，把 RLS 策略从 `using (true)` 改成 `using (auth.uid() = user_id)`，并给 `tasks` 加 `user_id` 字段。
