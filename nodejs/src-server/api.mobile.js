const express = require('express');
const mobileLobbyService = require('./services/mobile-lobby-service');

function createMobileApiRouter(deps) {
  const {
    authRouter,
    profileRouter,
    socialRouter,
    channelRouter,
    teamRouter,
    lobbyManager,
    gameManager,
  } = deps;

  const router = express.Router();

  router.use('/auth', authRouter);
  router.use('/profile', profileRouter);
  router.use('/social', socialRouter);
  router.use('/channel', channelRouter);
  router.use('/team', teamRouter);

  router.get('/lobby/players', async (_req, res) => {
    const players = await mobileLobbyService.getVisiblePlayers(lobbyManager);
    res.json({ players });
  });

  router.get('/lobby/rooms', (_req, res) => {
    const rooms = mobileLobbyService.getWaitingRooms(gameManager);
    res.json({ rooms });
  });

  return router;
}

module.exports = { createMobileApiRouter };
