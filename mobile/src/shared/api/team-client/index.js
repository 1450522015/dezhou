import http from '../http'

export const teamApi = {
  mine() {
    return http.get('/team/mine')
  },
  create(name) {
    return http.post('/team/create', { name })
  },
  invite(teamId, targetUserId) {
    return http.post(`/team/${teamId}/invite`, { targetUserId })
  },
  leave(teamId) {
    return http.post(`/team/${teamId}/leave`)
  },
  kick(teamId, targetUserId) {
    return http.post(`/team/${teamId}/kick`, { targetUserId })
  },
  transfer(teamId, newOwnerId) {
    return http.post(`/team/${teamId}/transfer`, { newOwnerId })
  },
  dissolve(teamId) {
    return http.delete(`/team/${teamId}`)
  },
  membersDetail(teamId) {
    return http.get(`/team/${teamId}/members-detail`)
  },
  teamMessages(teamId) {
    return http.get(`/channel/team/${teamId}/messages`)
  },
}
