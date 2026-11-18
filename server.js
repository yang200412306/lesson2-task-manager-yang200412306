/**
 * 本地启动：node --env-file-if-exists=.env server.js
 * 默认端口 3000，可用 PORT 覆盖
 */
const app = require('./app');
const PORT = Number(process.env.PORT) || 3000;

app.listen(PORT, () => {
  console.log('');
  console.log('  ✅ 智能任务管理系统已启动');
  console.log('  👉 打开： http://localhost:' + PORT);
  console.log('  👉 接口： http://localhost:' + PORT + '/api/tasks');
  console.log('  按 Ctrl + C 停止服务');
  console.log('');
});
