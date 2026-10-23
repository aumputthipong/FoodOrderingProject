import './styles/main.css'
import { VueQueryPlugin } from '@tanstack/vue-query'
import { createPinia } from 'pinia'
import { createApp } from 'vue'
import { toast } from 'vue-sonner'
import { z } from 'zod'
import App from './App.vue'
import { setupApiAuth } from './features/auth/setup'
import { errorMessage } from './lib/error-messages'
import { queryClient } from './lib/query-client'
import { createAppRouter } from './router'

z.config(z.locales.th())

const app = createApp(App)
const router = createAppRouter()

app.use(createPinia())
app.use(VueQueryPlugin, { queryClient })
app.use(router)
setupApiAuth(router)

app.config.errorHandler = (err) => {
  console.error(err)
  toast.error(errorMessage(err))
}

app.mount('#app')
