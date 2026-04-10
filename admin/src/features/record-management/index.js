import { adminApi } from '@/shared/api/admin-client'

export async function loadRecords(params) {
  return adminApi.getRecords(params)
}
