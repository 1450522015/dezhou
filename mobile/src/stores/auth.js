import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '@/shared/api/auth-client'
import {
  loadSavedCredentials,
  saveRememberedCredentials,
  clearRememberedCredentials,
} from '@/shared/utils/authPersistence'
import { reconnectSocketAfterAuth } from '@/shared/socket'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('token') || '')
  const user = ref(null)
  const loading = ref(false)
  const error = ref('')
  /** 路由多次进入时串行执行，避免并发重复 /me、静默登录 */
  let restoreChain = Promise.resolve()

  const isLoggedIn = computed(() => !!token.value)

  function applyToken(data) {
    token.value = data.token
    localStorage.setItem('token', data.token)
    user.value = data.user
    reconnectSocketAfterAuth()
  }

  /**
   * 启动时：有 token 则 /me；失败则若勾选过记住我则静默 login
   */
  async function restoreSession() {
    restoreChain = restoreChain.then(() => runRestoreSessionBody())
    return restoreChain
  }

  async function runRestoreSessionBody() {
    token.value = localStorage.getItem('token') || ''
    if (token.value) {
      try {
        const res = await authApi.me()
        user.value = res.user
        reconnectSocketAfterAuth()
        return
      } catch {
        token.value = ''
        localStorage.removeItem('token')
      }
    }
    const saved = loadSavedCredentials()
    if (saved?.username && saved?.password) {
      try {
        const data = await authApi.login(saved.username, saved.password)
        applyToken(data)
      } catch {
        /* 静默失败，交给路由踢去登录页 */
      }
    }
  }

  /** @deprecated 使用 restoreSession */
  async function init() {
    await restoreSession()
  }

  async function register(username, password, nickname, gender, rememberMe = false) {
    loading.value = true
    error.value = ''
    try {
      const data = await authApi.register(username, password, nickname, gender)
      applyToken(data)
      if (rememberMe) {
        saveRememberedCredentials(username, password)
      } else {
        clearRememberedCredentials()
      }
      return true
    } catch (e) {
      error.value = e.response?.data?.message || '注册失败'
      return false
    } finally {
      loading.value = false
    }
  }

  async function login(username, password, rememberMe = false) {
    loading.value = true
    error.value = ''
    try {
      const data = await authApi.login(username, password)
      applyToken(data)
      if (rememberMe) {
        saveRememberedCredentials(username, password)
      } else {
        clearRememberedCredentials()
      }
      return true
    } catch (e) {
      error.value = e.response?.data?.message || '登录失败'
      return false
    } finally {
      loading.value = false
    }
  }

  async function updateProfile(profile) {
    try {
      const res = await authApi.updateProfile(profile)
      if (res.user) {
        user.value = res.user
      }
      return true
    } catch (e) {
      error.value = e.response?.data?.message || '更新失败'
      return false
    }
  }

  /** 与 /profile/me、救济金等返回的 user 合并到当前会话 */
  function patchUser(partial) {
    if (user.value && partial && typeof partial === 'object') {
      user.value = { ...user.value, ...partial }
    }
  }

  function logout(options = {}) {
    const { clearRemember = true } = options
    restoreChain = Promise.resolve()
    token.value = ''
    user.value = null
    localStorage.removeItem('token')
    if (clearRemember) {
      clearRememberedCredentials()
    }
    reconnectSocketAfterAuth()
  }

  return {
    token,
    user,
    loading,
    error,
    isLoggedIn,
    init,
    restoreSession,
    register,
    login,
    updateProfile,
    patchUser,
    logout,
  }
})
