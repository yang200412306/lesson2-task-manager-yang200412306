/**
 * Supabase 客户端（单例）
 * 只有配置齐全时才创建，避免没配密钥直接启动就崩。
 */
const { createClient } = require('@supabase/supabase-js');
const config = require('../config');

let client = null;

function isConfigured() {
  const urlOk = /^https:\/\/.+\.supabase\.co$/.test(config.SUPABASE_URL || '');
  const keyOk = typeof config.SUPABASE_ANON_KEY === 'string' && config.SUPABASE_ANON_KEY.length > 40;
  return urlOk && keyOk;
}

function getClient() {
  if (!isConfigured()) {
    const err = new Error(
      'Supabase 尚未配置：请把 SUPABASE_URL 和 SUPABASE_ANON_KEY 填进 .env 文件（或 config.js），然后重启服务。'
    );
    err.status = 503;
    err.code = 'SUPABASE_NOT_CONFIGURED';
    throw err;
  }
  if (!client) {
    client = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY, {
      auth: { persistSession: false }
    });
  }
  return client;
}

module.exports = { isConfigured, getClient };
