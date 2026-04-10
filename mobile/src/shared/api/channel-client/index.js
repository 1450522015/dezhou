import http from '../http'

export const channelApi = {
  globalMessages() {
    return http.get('/channel/global/messages')
  },
}
