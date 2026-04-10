import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useLobbyStore = defineStore('lobby', () => {
  const onlinePlayers = ref([])
  const rooms = ref([])
  const invites = ref([])
  /** @type {import('vue').Ref<Array<{ username?: string, text?: string, ts?: number }>>} */
  const globalChat = ref([])

  function setPlayers(players) {
    onlinePlayers.value = players
  }

  function setRooms(roomList) {
    rooms.value = roomList
  }

  function addPlayer(player) {
    if (!onlinePlayers.value.find(p => p.id === player.id)) {
      onlinePlayers.value.push(player)
    }
  }

  function removePlayer(playerId) {
    onlinePlayers.value = onlinePlayers.value.filter(p => p.id !== playerId)
  }

  function updateRoom(roomInfo) {
    const idx = rooms.value.findIndex(r => r.id === roomInfo.id)
    if (idx >= 0) rooms.value[idx] = roomInfo
    else rooms.value.push(roomInfo)
  }

  function removeRoom(roomId) {
    rooms.value = rooms.value.filter(r => r.id !== roomId)
  }

  function addInvite(invite) {
    if (!invites.value.find(i => i.roomId === invite.roomId)) {
      invites.value.push(invite)
    }
  }

  function removeInvite(roomId) {
    invites.value = invites.value.filter(i => i.roomId !== roomId)
  }

  function setGlobalChat(list) {
    globalChat.value = Array.isArray(list) ? list : []
  }

  function pushGlobalChat(row) {
    if (!row?.text) return
    globalChat.value = [...globalChat.value, row].slice(-120)
  }

  return {
    onlinePlayers, rooms, invites, globalChat,
    setPlayers, setRooms, addPlayer, removePlayer, updateRoom, removeRoom,
    addInvite, removeInvite,
    setGlobalChat, pushGlobalChat,
  }
})
