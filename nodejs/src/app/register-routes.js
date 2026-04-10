/**
 * 注册 HTTP 路由与挂在 app 上的管理器引用
 */

function registerRoutes(app, deps) {
  const {
    authRouter,
    adminRouter,
    profileRouter,
    socialRouter,
    channelRouter,
    teamRouter,
    lobbyManager,
    gameManager,
  } = deps;

  app.use('/api/auth', authRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/profile', profileRouter);
  app.use('/api/social', socialRouter);
  app.use('/api/channel', channelRouter);
  app.use('/api/team', teamRouter);

  app.get('/lobby/players', async (_req, res) => {
    res.json({ players: await lobbyManager.getVisibleOnlinePlayers() });
  });

  app.get('/lobby/rooms', (_req, res) => {
    res.json({ rooms: gameManager.getWaitingRooms() });
  });

  app.set('lobby', lobbyManager);
  app.set('game', gameManager);
}

module.exports = registerRoutes;
