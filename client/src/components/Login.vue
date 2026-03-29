<template>
  <div class="auth-card card p-4 m-auto my-5">
    <h3 class="text-center mb-4">Log in</h3>

    <div v-if="error" class="alert alert-danger">{{ error }}</div>
    <div v-if="info" class="alert alert-info">
      {{ info }}
      <button v-if="showResend" class="btn btn-sm btn-link p-0 ms-1" @click="resend">Resend email</button>
    </div>

    <div class="mb-3">
      <label class="form-label">Email</label>
      <input v-model="email" type="email" class="form-control" placeholder="you@example.com" @keyup.enter="submit">
    </div>

    <div class="mb-3">
      <label class="form-label">Password</label>
      <input v-model="password" type="password" class="form-control" @keyup.enter="submit">
    </div>

    <button class="btn btn-primary w-100" :disabled="loading" @click="submit">
      {{ loading ? 'Logging in...' : 'Log in' }}
    </button>

    <p class="text-center mt-3 mb-0">
      <a href="/forgot-password">Forgot password?</a>
    </p>
    <p class="text-center mt-2 mb-0">
      Don't have an account? <a href="/register">Sign up</a>
    </p>
  </div>
</template>

<script>
export default {
  name: 'Login',
  data() {
    return {
      email: '',
      password: '',
      error: null,
      info: null,
      showResend: false,
      loading: false
    }
  },
  methods: {
    async submit() {
      this.error = null
      this.info = null
      this.showResend = false
      this.loading = true

      const result = await this.$auth.login(this.email, this.password)

      if (result.status) {
        const redirect = sessionStorage.getItem('loginRedirect') || '/'
        sessionStorage.removeItem('loginRedirect')
        window.location.href = redirect
      } else {
        if (result.needsVerification) {
          this.info = result.message
          this.showResend = true
        } else {
          this.error = result.message
        }
      }
      this.loading = false
    },

    async resend() {
      await this.$auth.resendVerification(this.email)
      this.info = 'Verification email sent! Check your inbox.'
      this.showResend = false
    }
  }
}
</script>

<style scoped>
.auth-card {
  max-width: 400px;
}
</style>
