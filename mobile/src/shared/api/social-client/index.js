import http from '../http'

export const socialApi = {
  listFriends() {
    return http.get('/social/friends')
  },

  listIncomingRequests() {
    return http.get('/social/friend/requests/incoming')
  },

  requestFriend(targetUserId) {
    return http.post('/social/friend/request', { targetUserId })
  },

  respond(requesterId, accept) {
    return http.post('/social/friend/respond', { requesterId, accept })
  },

  removeFriend(userId) {
    return http.delete(`/social/friend/${userId}`)
  },
}
