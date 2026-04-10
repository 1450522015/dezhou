async function getVisiblePlayers(lobbyManager) {
  return lobbyManager.getVisibleOnlinePlayers();
}

function getWaitingRooms(gameManager) {
  return gameManager.getWaitingRooms();
}

module.exports = {
  getVisiblePlayers,
  getWaitingRooms,
};
