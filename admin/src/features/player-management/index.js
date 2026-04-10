import { adminApi } from '@/shared/api/admin-client'

export async function loadPlayers(params) {
  return adminApi.getUsers(params)
}

export async function resetPlayerPassword(userId, password) {
  return adminApi.updatePassword(userId, password)
}
