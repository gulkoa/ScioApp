<template>
  <div class="auth-card card p-4 m-auto my-5">
    <h3 class="text-center mb-4">Forgot Password</h3>

    <div v-if="error" class="alert alert-danger">{{ error }}</div>
    <div v-if="success" class="alert alert-success">{{ success }}</div>

    <template v-if="!success">
      <p class="text-muted mb-3">Enter your email and we'll send you a link to reset your password.</p>

      <div class="mb-3">
        <label class="form-label">Email</label>
        <input v-model="email" type="email" class="form-control" placeholder="you@example.com" @keyup.enter="submit">
      </div>

      <button class="btn btn-primary w-100" :disabled="loading" @click="submit">
        {{ loading ? 'Sending...' : 'Send reset link' }}
      </button>
    </template>

    <p class="text-center mt-3 mb-0">
      <a href="/login">Back to login</a>
    </p>
  </div>
</template>

<script>
export default {
  name: 'ForgotPassword',
  data() {
    return {
      email: '',
      error: null,
      success: null,
      loading: false
    }
  },
  methods: {
    async submit() {
      this.error = null
      this.success = null
      if (!this.email) {
        this.error = 'Please enter your email address.'
        return
      }
      this.loading = true
      const result = await this.$auth.forgotPassword(this.email)
      if (result.status) {
        this.success = result.message
      } else {
        this.error = result.message
      }
      this.loading = false
    }
  }
}
</script>

<style scoped>
.auth-card {
  max-width: 400px;
}
</style>
