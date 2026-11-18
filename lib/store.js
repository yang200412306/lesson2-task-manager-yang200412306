/**
 * 数据存储层：两种后端，接口一致
 *  - local    ：把任务存成 data/tasks.json（默认，无需任何云账号）
 *  - supabase ：存到 Supabase 云端（配好 SUPABASE_URL / SUPABASE_ANON_KEY 时自动启用）
 *
 * 用环境变量 STORAGE 可以强制指定：STORAGE=local 或 STORAGE=supabase
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const db = require('./db');

const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, '..', 'data', 'tasks.json');

function mode() {
  const forced = (process.env.STORAGE || '').toLowerCase();
  if (forced === 'local') return 'local';
  if (forced === 'supabase') return 'supabase';
  return db.isConfigured() ? 'supabase' : 'local';
}

/* ---------------- 本地 JSON 存储 ---------------- */

function ensureFile() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]', 'utf8');
}

function readAll() {
  ensureFile();
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('[store] 任务文件损坏，已重置：', e.message);
    fs.writeFileSync(DATA_FILE, '[]', 'utf8');
    return [];
  }
}

function writeAll(tasks) {
  ensureFile();
  const tmp = DATA_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(tasks, null, 2), 'utf8');
  fs.renameSync(tmp, DATA_FILE); // 先写临时文件再替换，避免写一半断电导致文件损坏
}

function sortDesc(list) {
  return list.slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

const localStore = {
  async list(priority) {
    const all = readAll();
    const filtered = priority ? all.filter((t) => t.priority === priority) : all;
    return sortDesc(filtered);
  },

  async create({ title, priority }) {
    const task = {
      id: crypto.randomUUID(),
      title,
      priority: priority || '中',
      completed: false,
      created_at: new Date().toISOString()
    };
    const all = readAll();
    all.push(task);
    writeAll(all);
    return task;
  },

  async update(id, patch) {
    const all = readAll();
    const index = all.findIndex((t) => t.id === id);
    if (index < 0) return null;
    all[index] = Object.assign({}, all[index], patch);
    writeAll(all);
    return all[index];
  },

  async remove(id) {
    const all = readAll();
    const index = all.findIndex((t) => t.id === id);
    if (index < 0) return null;
    const removed = all.splice(index, 1)[0];
    writeAll(all);
    return removed;
  }
};

/* ---------------- Supabase 云端存储 ---------------- */

const COLUMNS = 'id,title,priority,completed,created_at';

const supabaseStore = {
  async list(priority) {
    const supabase = db.getClient();
    let query = supabase
      .from('tasks')
      .select(COLUMNS)
      .order('created_at', { ascending: false });
    if (priority) query = query.eq('priority', priority);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async create({ title, priority }) {
    const supabase = db.getClient();
    const { data, error } = await supabase
      .from('tasks')
      .insert([{ title, priority: priority || '中' }])
      .select(COLUMNS)
      .single();
    if (error) throw error;
    return data;
  },

  async update(id, patch) {
    const supabase = db.getClient();
    const { data, error } = await supabase
      .from('tasks')
      .update(patch)
      .eq('id', id)
      .select(COLUMNS)
      .maybeSingle();
    if (error) throw error;
    return data || null;
  },

  async remove(id) {
    const supabase = db.getClient();
    const { data, error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id)
      .select('id')
      .maybeSingle();
    if (error) throw error;
    return data || null;
  }
};

/* ---------------- 对外统一接口 ---------------- */

function current() {
  return mode() === 'supabase' ? supabaseStore : localStore;
}

module.exports = {
  mode,
  dataFile: DATA_FILE,
  list: (priority) => current().list(priority),
  create: (payload) => current().create(payload),
  update: (id, patch) => current().update(id, patch),
  remove: (id) => current().remove(id)
};
