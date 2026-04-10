import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import MobileLayout from '../layouts/MobileLayout.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: MobileLayout,
      children: [
        {
          path: '',
          redirect: '/login',
        },
        {
          path: 'login',
          name: 'Login',
          component: () => import('../views/LoginView.vue'),
        },
        {
          path: 'lobby',
          name: 'Lobby',
          component: () => import('../views/LobbyView.vue'),
        },
        {
          path: 'game/:id',
          name: 'Game',
          component: () => import('../views/GameView.vue'),
        },
        {
          path: 'profile',
          name: 'Profile',
          component: () => import('../views/ProfileView.vue'),
        },
        {
          path: 'teams',
          name: 'Teams',
          component: () => import('../views/TeamsView.vue'),
        },
        {
          path: 'settings',
          name: 'Settings',
          component: () => import('../views/SettingsView.vue'),
        },
        {
          path: 'more',
          name: 'More',
          component: () => import('../views/MoreView.vue'),
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
