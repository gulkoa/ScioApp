import Vue from 'vue'
import axios from 'axios'

const url = window.location.protocol + '//' + window.location.host + '/api/auth/'

/**
 * Simple JWT auth store exposed as Vue plugin ($auth).
 * Replaces Auth0 — stores token in localStorage, user state in a reactive Vue instance.
 */
let instance

export const getInstance = () => instance

export const useAuth = () => {
  if (instance) return instance

  instance = new Vue({
    data() {
      return {
        loading: true,
        isAuthenticated: false,
        user: null,   // { id, email, name, role, permissions }
        token: null,
        error: null
      }
    },

    methods: {
      // Try to restore session from stored token
      async init() {
        const token = localStorage.getItem('token')
        if (!token) {
          this.loading = false
          return
        }

        this.token = token
        try {
          const res = await axios.get(url + 'me', {
            headers: { Authorization: 'Bearer ' + token }
          })
          if (res.data.status) {
            this.user = res.data.user
            this.token = res.data.token // refreshed token with latest permissions
            localStorage.setItem('token', res.data.token)
            this.isAuthenticated = true
          } else {
            this._clearSession()
          }
        } catch {
          this._clearSession()
        }
        this.loading = false
      },

      // Log in with email/password, returns { status, message, needsVerification? }
      async login(email, password) {
        try {
          const res = await axios.post(url + 'login', { email, password })
          if (res.data.status) {
            this.token = res.data.token
            this.user = res.data.user
            this.isAuthenticated = true
            localStorage.setItem('token', res.data.token)
          }
          return res.data
        } catch {
          return { status: false, message: 'Network error' }
        }
      },

      // Register a new account
      async register(name, email, password) {
        try {
          const res = await axios.post(url + 'register', { name, email, password })
          return res.data
        } catch {
          return { status: false, message: 'Network error' }
        }
      },

      // Resend verification email
      async resendVerification(email) {
        try {
          const res = await axios.post(url + 'resend-verification', { email })
          return res.data
        } catch {
          return { status: false, message: 'Network error' }
        }
      },

      // Request a password reset email
      async forgotPassword(email) {
        try {
          const res = await axios.post(url + 'forgot-password', { email })
          return res.data
        } catch {
          return { status: false, message: 'Network error' }
        }
      },

      // Complete password reset with token from email
      async resetPassword(token, password) {
        try {
          const res = await axios.post(url + 'reset-password', { token, password })
          return res.data
        } catch {
          return { status: false, message: 'Network error' }
        }
      },

      // Change display name (authenticated)
      async changeName(newName) {
        try {
          const res = await axios.patch(url + 'me/name', { name: newName }, {
            headers: { Authorization: 'Bearer ' + this.token }
          })
          if (res.data.status) {
            this.user = res.data.user
            this.token = res.data.token
            localStorage.setItem('token', res.data.token)
          }
          return res.data
        } catch {
          return { status: false, message: 'Network error' }
        }
      },

      // Change password while logged in (requires current password)
      async changePassword(currentPassword, newPassword) {
        try {
          const res = await axios.patch(url + 'me/password', { currentPassword, newPassword }, {
            headers: { Authorization: 'Bearer ' + this.token }
          })
          return res.data
        } catch {
          return { status: false, message: 'Network error' }
        }
      },

      // Permanently delete the current user's account
      async deleteAccount() {
        try {
          const res = await axios.delete(url + 'me', {
            headers: { Authorization: 'Bearer ' + this.token }
          })
          if (res.data.status) this._clearSession()
          return res.data
        } catch {
          return { status: false, message: 'Network error' }
        }
      },

      // Check if user has a specific permission
      hasPermission(permission) {
        if (!this.user) return false
        if (this.user.role === 'admin') return true
        return (this.user.permissions || []).includes(permission)
      },

      logout() {
        this._clearSession()
        window.location.href = '/'
      },

      _clearSession() {
        this.token = null
        this.user = null
        this.isAuthenticated = false
        localStorage.removeItem('token')
      }
    }
  })

  return instance
}

// Vue plugin — install with Vue.use(AuthPlugin)
export const AuthPlugin = {
  install(Vue) {
    Vue.prototype.$auth = useAuth()
  }
}
