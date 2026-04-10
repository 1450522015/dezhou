import http from '../http'

export const authApi = {
  register(username, password, nickname, gender) {
    return http.post('/auth/register', { username, password, nickname, gender })
  },

  login(username, password) {
    return http.post('/auth/login', { username, password })
  },

  me() {
    return http.get('/auth/me')
  },

  updateProfile(profile) {
    return http.put('/auth/profile', profile)
  },
}
