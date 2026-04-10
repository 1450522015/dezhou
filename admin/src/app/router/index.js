import { createRouter, createWebHistory } from 'vue-router'
import AdminShell from '@/layouts/admin-shell/index.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: AdminShell,
      children: [
        {
          path: '',
          name: 'AdminDashboard',
          component: () => import('@/pages/dashboard-page/index.vue'),
        },
        {
          path: 'rooms',
          name: 'AdminRooms',
          component: () => import('@/pages/rooms-page/index.vue'),
        },
        {
          path: 'players',
          name: 'AdminPlayers',
          component: () => import('@/pages/players-page/index.vue'),
        },
        {
          path: 'records',
          name: 'AdminRecords',
          component: () => import('@/pages/records-page/index.vue'),
        },
      ],
    },
  ],
})

export default router
