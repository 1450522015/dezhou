/**
 * 注册 HTTP 路由与挂在 app 上的管理器引用
 */

function registerRoutes(app, deps) {
  const {
    adminRouter,
    mobileApiRouter,
  } = deps;

  app.use('/api/admin', adminRouter);
  app.use('/api', mobileApiRouter);

  app.set('lobby', deps.lobbyManager);
  app.set('game', deps.gameManager);
}

module.exports = registerRoutes;
