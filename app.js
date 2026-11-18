/**
 * Express 应用：页面托管 + 任务 API
 * 数据层由 lib/store.js 决定：默认本地 JSON 文件，配好 Supabase 密钥后自动切到云端。
 */
const path = require('path');
const express = require('express');
const store = require('./lib/store');

const app = express();
app.use(express.json({ limit: '100kb' }));
app.use(express.static(path.join(__dirname, 'public')));

const PRIORITIES = ['高', '中', '低'];
const MAX_TITLE_LENGTH = 100;

/** 把 async 路由里的异常统一交给错误处理中间件 */
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/** 把 Supabase 报错翻译成中文提示，方便课堂排错 */
function explain(error) {
  const message = (error && error.message) || '未知错误';
  if (error && (error.code === '42P01' || /relation .* does not exist/i.test(message))) {
    return { status: 500, message: '数据表 tasks 不存在：请先在 Supabase 的 SQL Editor 里执行 supabase/schema.sql' };
  }
  if (/\bJWT\b/i.test(message) || /invalid api key/i.test(message)) {
    return { status: 500, message: 'Supabase 密钥无效：请重新复制 Project URL 和 anon public key 到 .env' };
  }
  if (/row-level security/i.test(message)) {
    return {
      status: 500,
      message: '被行级安全策略拦住（row-level security）：在 SQL Editor 执行 schema.sql 里的 RLS 策略部分即可'
    };
  }
  if (/fetch failed|ENOTFOUND|ETIMEDOUT/i.test(message)) {
    return { status: 502, message: '连不上 Supabase：请检查网络（校园网可能需要代理）或 Project URL 是否正确' };
  }
  return { status: 500, message: '数据库操作失败：' + message };
}

/** 校验新增/更新任务的输入 */
function readTaskInput(body, { requireTitle }) {
  const rawTitle = body && typeof body.title === 'string' ? body.title.trim() : '';
  const priority = body && body.priority;

  if (requireTitle && !rawTitle) {
    const err = new Error('任务标题不能为空');
    err.status = 400;
    throw err;
  }
  if (rawTitle && rawTitle.length > MAX_TITLE_LENGTH) {
    const err = new Error('任务标题不能超过 ' + MAX_TITLE_LENGTH + ' 个字');
    err.status = 400;
    throw err;
  }
  if (priority !== undefined && !PRIORITIES.includes(priority)) {
    const err = new Error('优先级只能是 高 / 中 / 低');
    err.status = 400;
    throw err;
  }

  const patch = {};
  if (rawTitle) patch.title = rawTitle;
  if (priority !== undefined) patch.priority = priority;
  if (typeof body.completed === 'boolean') patch.completed = body.completed;
  return patch;
}

// —— 健康检查：前端靠它判断当前是本地存储还是云端存储 ——
app.get(
  '/api/health',
  wrap(async (req, res) => {
    res.json({
      ok: true,
      storage: store.mode(), // local | supabase
      serverTime: new Date().toISOString()
    });
  })
);

// —— 查询任务列表：可按优先级筛选，按创建时间倒序 ——
app.get(
  '/api/tasks',
  wrap(async (req, res) => {
    const priority = req.query.priority;
    const data = await store.list(priority && PRIORITIES.includes(priority) ? priority : null);
    res.json({ data });
  })
);

// —— 新增任务 ——
app.post(
  '/api/tasks',
  wrap(async (req, res) => {
    const patch = readTaskInput(req.body, { requireTitle: true });
    const data = await store.create({ title: patch.title, priority: patch.priority || '中' });
    res.status(201).json({ data });
  })
);

// —— 更新任务（完成状态切换 / 改标题 / 改优先级）——
app.patch(
  '/api/tasks/:id',
  wrap(async (req, res) => {
    const patch = readTaskInput(req.body, { requireTitle: false });

    if (Object.keys(patch).length === 0) {
      const err = new Error('没有需要更新的字段（可传 completed / title / priority）');
      err.status = 400;
      throw err;
    }

    const data = await store.update(req.params.id, patch);
    if (!data) {
      const err = new Error('任务不存在或已被删除');
      err.status = 404;
      throw err;
    }

    res.json({ data });
  })
);

// —— 删除任务 ——
app.delete(
  '/api/tasks/:id',
  wrap(async (req, res) => {
    const data = await store.remove(req.params.id);
    if (!data) {
      const err = new Error('任务不存在或已被删除');
      err.status = 404;
      throw err;
    }
    res.json({ ok: true, id: data.id });
  })
);

// 未匹配的 /api 路径统一返回 JSON 404，避免返回整页 HTML
app.use('/api', (req, res) => {
  res.status(404).json({ error: '接口不存在：' + req.method + ' ' + req.originalUrl });
});

// 兜底错误处理
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  const mapped = err.status && err.status < 500 ? { status: err.status, message: err.message } : explain(err);
  if (mapped.status >= 500) console.error('[API ERROR]', err.message);
  res.status(mapped.status).json({ error: mapped.message });
});

module.exports = app;
