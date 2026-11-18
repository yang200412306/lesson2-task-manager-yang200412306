-- =====================================================
-- 练习二：智能任务管理系统 —— 建表 + 安全策略
-- 用法：Supabase 控制台 → 左侧 SQL Editor → New query → 全选粘贴 → Run
-- 成功标志：出现 "Success. No rows returned"
-- =====================================================

-- 1. 任务表：标题 / 优先级 / 完成状态 / 创建时间
create table if not exists public.tasks (
  id          uuid primary key default gen_random_uuid(),
  title       text        not null check (char_length(title) between 1 and 100),
  priority    text        not null default '中' check (priority in ('高', '中', '低')),
  completed   boolean     not null default false,
  created_at  timestamptz not null default now()
);

-- 2. 按创建时间倒序查询会用到索引
create index if not exists tasks_created_at_idx on public.tasks (created_at desc);

-- 3. 开启行级安全（RLS）：默认没人能读写，必须显式放行
alter table public.tasks enable row level security;

-- 4. 课堂项目：允许匿名（anon key）读写这张表
--    生产项目请改成按用户隔离（配合 Supabase Auth）
drop policy if exists "课堂练习：允许匿名读写任务" on public.tasks;
create policy "课堂练习：允许匿名读写任务"
  on public.tasks
  for all
  to anon, authenticated
  using (true)
  with check (true);
