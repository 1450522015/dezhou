import { adminApi } from '@/shared/api/admin-client'

/**
 * 仪表盘：聚合统计与最近房间（业务块对外唯一入口）
 */
export async function loadDashboardOverview() {
  const stats = {
    onlinePlayers: 0,
    activeRooms: 0,
    totalGames: 0,
    totalUsers: 0,
  }

  try {
    const statsRes = await adminApi.getStats()
    stats.onlinePlayers = statsRes?.onlinePlayers || 0
    stats.activeRooms = statsRes?.activeRooms || 0
    stats.totalGames = statsRes?.totalGames || 0
    stats.totalUsers = statsRes?.totalUsers || 0
  } catch {
    // 统计接口失败时仍展示页面
  }

  let recentRooms = []
  try {
    const roomsRes = await adminApi.getRooms()
    recentRooms = Array.isArray(roomsRes?.rooms) ? roomsRes.rooms.slice(0, 5) : []
  } catch {
    recentRooms = []
  }

  return { stats, recentRooms }
}
