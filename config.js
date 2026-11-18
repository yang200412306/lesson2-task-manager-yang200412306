/**
 * 配置：优先读环境变量，没读到就用下面内嵌的值。
 * 课堂项目为了省事可以直接填在下面两行（放在服务器本地的 .env 里更规范）。
 *
 * 默认不填也能跑：数据会存到本机 data/tasks.json（本地存储模式）。
 * 只要把下面两个值填好，就会自动切换到 Supabase 云端存储，多人共享。
 */
const SUPABASE_URL = process.env.SUPABASE_URL || ''; // 形如 https://xxxxxxxx.supabase.co
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || ''; // eyJ 开头的一长串

module.exports = {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  PORT: Number(process.env.PORT) || 3000
};
