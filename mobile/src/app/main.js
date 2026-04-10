import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { registerAuthRouter } from '@/shared/utils/authRedirect'
import '@/shared/styles/global.css'

registerAuthRouter(router)

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
