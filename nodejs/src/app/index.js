/**
 * 应用装配入口：HTTP + Socket.IO + 路由/事件注册 + 启动
 */

const config = require('../config/env');
const { createHttpServer } = require('./http-server');
const { attachSocketIO } = require('./socket-server');
const registerRoutes = require('./register-routes');
const registerSocketEvents = require('./register-socket-events');

const { initDatabase } = require('../../src-server/models');
const { router: authRouter } = require('../../src-server/auth');
const { router: adminRouter } = require('../../src-server/admin');
const { router: profileRouter } = require('../../src-server/profile');
const { router: socialRouter } = require('../../src-server/social');
const { LobbyManager } = require('../../src-server/lobby');
const { GameManager } = require('../../src-server/game');
const {
  router: channelRouter,
  pushGlobalMessage,
  pushTeamMessage,
} = require('../../src-server/channel');
const { router: teamRouter } = require('../../src-server/team');

const { app, server } = createHttpServer(config);
const io = attachSocketIO(server);

app.set('io', io);

server.on('error', err => {
  if (err.code === 'EADDRINUSE') {
    console.error(`端口 ${config.PORT} 已被占用，请先关闭旧进程或修改 PORT`);
    process.exit(1);
  }
  console.error('HTTP server error:', err);
  process.exit(1);
});

const lobbyManager = new LobbyManager();
const gameManager = new GameManager();

registerRoutes(app, {
  authRouter,
  adminRouter,
  profileRouter,
  socialRouter,
  channelRouter,
  teamRouter,
  lobbyManager,
  gameManager,
});

registerSocketEvents(io, {
  config,
  lobbyManager,
  gameManager,
  pushGlobalMessage,
  pushTeamMessage,
});

setInterval(() => {
  gameManager.cleanupFinished();
}, 300000);

async function start() {
  try {
    await initDatabase();
    console.log('MongoDB initialized');
    await lobbyManager.connect();

    server.listen(config.PORT, config.HOST, () => {
      console.log(`Dezhou server started: http://${config.HOST}:${config.PORT}`);
    });
  } catch (err) {
    console.error('启动失败:', err);
    process.exit(1);
  }
}

start();
