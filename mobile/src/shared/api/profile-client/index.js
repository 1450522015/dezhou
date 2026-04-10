import http from '../http'

export const profileApi = {
  getMe() {
    return http.get('/profile/me')
  },

  putMe(body) {
    return http.put('/profile/me', body)
  },

  postRelief() {
    return http.post('/profile/relief')
  },

  getUser(userId) {
    return http.get(`/profile/user/${userId}`)
  },
}
