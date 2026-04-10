/**
 * 本地持久化：与主流 App 一致用 JWT 存 token；可选「记住我」保存账号密码以便 token 失效后静默重登。
 * 密码仅存本机 localStorage（Web）/ WebView 同源存储（Capacitor），公共设备请勿勾选。
 */
const KEY_REMEMBER = 'dezhou_auth_remember'
const KEY_SAVED = 'dezhou_auth_saved'

export function loadRememberFlag() {
  return localStorage.getItem(KEY_REMEMBER) === '1'
}

/** @returns {{ username: string, password: string } | null} */
export function loadSavedCredentials() {
  if (!loadRememberFlag()) return null
  try {
    const raw = localStorage.getItem(KEY_SAVED)
    if (!raw) return null
    const o = JSON.parse(raw)
    if (!o || typeof o.username !== 'string' || typeof o.password !== 'string') return null
    return { username: o.username, password: o.password }
  } catch {
    return null
  }
}

export function saveRememberedCredentials(username, password) {
  localStorage.setItem(KEY_REMEMBER, '1')
  localStorage.setItem(KEY_SAVED, JSON.stringify({ username, password }))
}

export function saveRememberUsernameOnly(username) {
  localStorage.setItem(KEY_REMEMBER, '1')
  localStorage.setItem(KEY_SAVED, JSON.stringify({ username, password: '' }))
}

export function clearRememberedCredentials() {
  localStorage.removeItem(KEY_REMEMBER)
  localStorage.removeItem(KEY_SAVED)
}
