import Vue from 'vue'
import App from './App.vue'

Vue.config.productionTip = false

const app = new Vue({
  render: h => h(App)
})
// eslint-disable-next-line no-unused-vars
import { Auth0Plugin } from "./auth";

Vue.use(Auth0Plugin, {
  domain: "dev-hmqllj6v.us.auth0.com",
  clientId: "wIImCZrdXpspi0umomgXHMspA6dsqoJu",
  responseType: "token id_token",
  // redirectUri: "http://localhost:8080",
  redirectUri: window.location.origin,
  // redirectUri: 'https://scioapp.gulko.net/',
  // scope: "add:db",
  audience: "https://scioapp.gulko.net/api"
  // audience: "https://dev-hmqllj6v.us.auth0.com/api/v2/"
})

const VueCookie = require('vue-cookie')
Vue.use(VueCookie)

app.$mount('#app')

