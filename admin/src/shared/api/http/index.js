import axios from 'axios'

const isDev = import.meta.env.DEV
const baseURL = isDev ? '/api' : `${window.__BACKEND_URL__ || ''}/api`

const http = axios.create({
  baseURL,
  timeout: 10000,
})

http.interceptors.response.use(
  response => response.data,
  error => Promise.reject(error),
)

export default http
