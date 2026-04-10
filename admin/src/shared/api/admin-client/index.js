import http from '../http'

export const adminApi = {
  getUsers(params = {}) {
    return http.get('/admin/users', { params })
  },

  getOnlineCount() {
    return http.get('/admin/users/online')
  },

  updatePassword(userId, password) {
    return http.put(`/admin/users/${userId}/password`, { password })
  },

  getUserCount() {
    return http.get('/admin/users/count')
  },

  getRooms() {
    return http.get('/admin/rooms')
  },

  closeRoom(roomId) {
    return http.delete(`/admin/rooms/${roomId}`)
  },

  getRecords(params = {}) {
    return http.get('/admin/records', { params })
  },

  getStats() {
    return http.get('/admin/stats')
  },
}
