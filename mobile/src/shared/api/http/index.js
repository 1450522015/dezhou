import axios from 'axios'
import { redirectToLogin } from '@/shared/utils/authRedirect'

const isDev = import.meta.env.DEV

const baseURL = isDev ? '/api' : `${window.__BACKEND_URL__ || ''}/api`

const http = axios.create({
  baseURL,
  timeout: 10000,
})

http.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

http.interceptors.response.use(
  res => res.data,
  err => {
    const status = err.response?.status
    const url = String(err.config?.url || '')
    if (status === 401) {
      const isAuthProbe = url.includes('/auth/me')
      const isAuthLogin = url.includes('/auth/login')
      const isAuthRegister = url.includes('/auth/register')
      if (isAuthLogin || isAuthRegister) {
        return Promise.reject(err)
      }
      if (isAuthProbe) {
        return Promise.reject(err)
      }
      localStorage.removeItem('token')
      const path = typeof window !== 'undefined' ? `${window.location.pathname}${window.location.search}` : ''
      redirectToLogin(path || undefined)
    }
    return Promise.reject(err)
  }
)

export default http
