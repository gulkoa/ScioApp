import Vue from 'vue'
import App from './App.vue'
import { AuthPlugin } from './auth'

Vue.config.productionTip = false
Vue.use(AuthPlugin)

const app = new Vue({
  render: h => h(App)
})

app.$mount('#app')
