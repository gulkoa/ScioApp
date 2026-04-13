import Vue from 'vue'
import App from './App.vue'
import { AuthPlugin } from './auth'
import router from './router'

Vue.config.productionTip = false
Vue.use(AuthPlugin)

const app = new Vue({
  router,
  render: h => h(App)
})

app.$mount('#app')
