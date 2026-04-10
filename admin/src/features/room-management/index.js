import { adminApi } from '@/shared/api/admin-client'

export async function loadRooms() {
  const res = await adminApi.getRooms()
  return Array.isArray(res?.rooms) ? res.rooms : []
}

export async function closeRoom(roomId) {
  await adminApi.closeRoom(roomId)
}
