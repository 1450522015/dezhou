import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import MobileShell from '@/layouts/mobile-shell/index.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: MobileShell,
      children: [
        {
          path: '',
          redirect: '/login',
        },
        {
          path: 'login',
          name: 'Login',
          component: () => import('@/pages/login-page/index.vue'),
        },
        {
          path: 'lobby',
          name: 'Lobby',
          component: () => import('@/pages/lobby-page/index.vue'),
        },
        {
          path: 'game/:id',
          name: 'Game',
          component: () => import('@/pages/game-page/index.vue'),
        },
        {
          path: 'profile',
          name: 'Profile',
          component: () => import('@/pages/profile-page/index.vue'),
        },
        {
          path: 'teams',
          name: 'Teams',
          component: () => import('@/pages/teams-page/index.vue'),
        },
        {
          path: 'settings',
          name: 'Settings',
          component: () => import('@/pages/settings-page/index.vue'),
        },
        {
          path: 'more',
          name: 'More',
          component: () => import('@/pages/more-page/index.vue'),
        },
      ],
    },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore()
  await authStore.restoreSession()

  if (to.name !== 'Login' && !authStore.isLoggedIn) {
    next({ path: '/login', query: { redirect: to.fullPath } })
    return
  }

  if (to.name === 'Login' && authStore.isLoggedIn) {
    const redirect = typeof to.query.redirect === 'string' ? to.query.redirect : ''
    next(redirect && redirect.startsWith('/') ? redirect : '/lobby')
    return
  }

  next()
})

export default router
