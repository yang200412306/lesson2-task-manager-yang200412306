/* 前端逻辑：调自己的 Express 接口，接口背后是 Supabase */
const $ = (id) => document.getElementById(id);

const state = {
  tasks: [],
  filter: '全部',
  loading: true,
  configured: true
};

/* ---------- 小工具 ---------- */
const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const pad = (n) => String(n).padStart(2, '0');

/** 2026-11-18T14:23:00+00:00 → 11-18 22:23 */
function formatTime(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

let toastTimer = null;
function toast(msg, isError) {
  const el = $('toast');
  el.textContent = msg;
  el.className = 'toast show' + (isError ? ' err' : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = 'toast'; }, 2600);
}

/* ---------- 接口调用 ---------- */
async function api(path, options) {
  const res = await fetch(path, Object.assign({ headers: { 'Content-Type': 'application/json' } }, options || {}));
  let body = null;
  try { body = await res.json(); } catch (e) { /* 非 JSON 响应 */ }
  if (!res.ok) {
    const message = (body && (body.error || body.message)) || `请求失败（HTTP ${res.status}）`;
    throw new Error(message);
  }
  return body;
}

/* ---------- 渲染 ---------- */
function renderStats() {
  const total = state.tasks.length;
  const done = state.tasks.filter((t) => t.completed).length;
  const rate = total === 0 ? 0 : Math.round((done / total) * 100);

  $('stTotal').innerHTML = total + '<small>条</small>';
  $('stDone').innerHTML = done + '<small>条</small>';
  $('stRate').innerHTML = rate + '<small>%</small>';
  $('stBar').style.width = rate + '%';

  const count = (p) => state.tasks.filter((t) => t.priority === p).length;
  $('cntAll').textContent = total;
  $('cntHigh').textContent = count('高');
  $('cntMid').textContent = count('中');
  $('cntLow').textContent = count('低');
}

function taskHtml(t) {
  return `<li class="task ${t.completed ? 'done' : ''}" data-p="${escapeHtml(t.priority)}" data-id="${t.id}">
    <button class="check ${t.completed ? 'on' : ''}" data-act="toggle" aria-label="切换完成状态">
      <svg width="12" height="12" viewBox="0 0 12 12"><path d="M1.5 6.2l3 3 6-6.4" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </button>
    <div class="body">
      <div class="title">${escapeHtml(t.title)}</div>
      <div class="meta">
        <span class="pill" data-p="${escapeHtml(t.priority)}">${escapeHtml(t.priority)}优先级</span>
        <span>创建于 ${formatTime(t.created_at)}</span>
        <span>${t.completed ? '已完成' : '进行中'}</span>
      </div>
    </div>
    <button class="del" data-act="del" aria-label="删除任务">
      <svg width="15" height="15" viewBox="0 0 16 16"><path d="M2.5 4.5h11M6 4.5V3h4v1.5M4 4.5l.8 9h6.4l.8-9M6.6 7v4M9.4 7v4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
    </button>
  </li>`;
}

function render() {
  const list = $('list');
  renderStats();

  if (state.loading) {
    list.innerHTML = '<li class="skeleton"></li><li class="skeleton"></li><li class="skeleton"></li>';
    $('empty').style.display = 'none';
    return;
  }

  const visible = state.filter === '全部'
    ? state.tasks
    : state.tasks.filter((t) => t.priority === state.filter);

  $('listHint').textContent = state.filter === '全部' ? '全部任务 · 按创建时间倒序' : `筛选：${state.filter}优先级 · 共 ${visible.length} 条`;
  $('listCount').textContent = `共 ${visible.length} 条`;
  $('empty').style.display = visible.length === 0 ? 'block' : 'none';
  list.innerHTML = visible.map(taskHtml).join('');
}

function setStatus(ok, text) {
  $('statusDot').className = 'dot ' + (ok ? 'ok' : 'bad');
  $('statusText').textContent = text;
}

/* ---------- 数据加载 ---------- */
async function loadTasks(showError) {
  try {
    const body = await api('/api/tasks');
    state.tasks = body.data || [];
    state.loading = false;
    render();
    setStatus(true, '已连接 · ' + state.tasks.length + ' 条任务');
  } catch (e) {
    state.loading = false;
    state.tasks = [];
    render();
    setStatus(false, '读取失败');
    if (showError !== false) toast(e.message, true);
  }
}

async function checkHealth() {
  try {
    const h = await api('/api/health');
    state.configured = Boolean(h.supabaseConfigured);
    $('notice').className = 'notice' + (state.configured ? '' : ' show');
    if (state.configured) {
      await loadTasks();
    } else {
      state.loading = false;
      render();
      setStatus(false, '未配置数据库');
    }
  } catch (e) {
    state.loading = false;
    render();
    setStatus(false, '服务未就绪');
    toast('连不上后端服务：请确认 node server.js 已启动', true);
  }
}

/* ---------- 交互 ---------- */
async function addTask() {
  const titleEl = $('title');
  const title = titleEl.value.trim();
  const priority = $('priority').value;

  if (!title) { toast('先写一条任务标题', true); titleEl.focus(); return; }

  const btn = $('addBtn');
  btn.disabled = true;
  btn.textContent = '添加中…';
  try {
    await api('/api/tasks', { method: 'POST', body: JSON.stringify({ title, priority }) });
    titleEl.value = '';
    titleEl.focus();
    $('priority').value = '中';
    await loadTasks(false);
    toast('已添加：' + title);
  } catch (e) {
    toast(e.message, true);
  } finally {
    btn.disabled = false;
    btn.textContent = '＋ 添加任务';
  }
}

async function toggleTask(id) {
  const task = state.tasks.find((t) => t.id === id);
  if (!task) return;
  try {
    await api('/api/tasks/' + id, { method: 'PATCH', body: JSON.stringify({ completed: !task.completed }) });
    task.completed = !task.completed; // 先本地翻转，界面立刻响应
    render();
    await loadTasks(false);
  } catch (e) {
    toast(e.message, true);
    await loadTasks(false);
  }
}

async function deleteTask(id) {
  const task = state.tasks.find((t) => t.id === id);
  if (!task) return;
  if (!confirm('确定删除这条任务？\n\n' + task.title)) return;
  try {
    await api('/api/tasks/' + id, { method: 'DELETE' });
    state.tasks = state.tasks.filter((t) => t.id !== id);
    render();
    toast('已删除');
  } catch (e) {
    toast(e.message, true);
    await loadTasks(false);
  }
}

/* ---------- 事件绑定 ---------- */
$('addBtn').addEventListener('click', addTask);
$('title').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); addTask(); } });

$('filters').addEventListener('click', (e) => {
  const tab = e.target.closest('.tab');
  if (!tab) return;
  state.filter = tab.dataset.filter;
  document.querySelectorAll('.tab').forEach((el) => el.classList.toggle('active', el === tab));
  render();
});

$('list').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-act]');
  if (!btn) return;
  const li = e.target.closest('.task');
  if (!li) return;
  if (btn.dataset.act === 'toggle') toggleTask(li.dataset.id);
  if (btn.dataset.act === 'del') deleteTask(li.dataset.id);
});

/* 启动 */
checkHealth();
// 每 30 秒自动同步一次，方便课堂演示“多人共享”
setInterval(() => { if (state.configured && !document.hidden) loadTasks(false); }, 30000);


