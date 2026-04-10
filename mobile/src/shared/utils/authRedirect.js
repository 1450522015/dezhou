/**
 * axios 等非组件处跳转登录页（避免硬编码 window.location 丢失 hash/history）
 */
let _router = null

export function registerAuthRouter(router) {
  _router = router
}

/**
 * @param {string} [redirect] 登录后要回到的路径，如 /game/xxx
 */
export function redirectToLogin(redirect) {
  const q = redirect && redirect !== '/login' ? { redirect } : {}
  if (_router) {
    _router.replace({ path: '/login', query: q }).catch(() => {})
  } else {
    const sp = new URLSearchParams(q)
    const qs = sp.toString()
    window.location.href = qs ? `/login?${qs}` : '/login'
  }
}
