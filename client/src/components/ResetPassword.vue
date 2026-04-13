<template>
  <div class="auth-card card p-4 m-auto my-5">
    <h3 class="text-center mb-4">Reset Password</h3>

    <div v-if="error" class="alert alert-danger">{{ error }}</div>
    <div v-if="success" class="alert alert-success">
      {{ success }} <router-link to="/login">Log in</router-link>
    </div>

    <template v-if="!success">
      <div v-if="!token" class="alert alert-warning">
        Invalid reset link. <router-link to="/forgot-password">Request a new one</router-link>.
      </div>

      <template v-else>
        <div class="mb-3">
          <label class="form-label">New Password</label>
          <input v-model="password" type="password" class="form-control" placeholder="At least 6 characters" @keyup.enter="submit">
        </div>

        <div class="mb-3">
          <label class="form-label">Confirm New Password</label>
          <input v-model="confirm" type="password" class="form-control" @keyup.enter="submit">
        </div>

        <button class="btn btn-primary w-100" :disabled="loading" @click="submit">
          {{ loading ? 'Updating...' : 'Set new password' }}
        </button>
      </template>
    </template>

    <p class="text-center mt-3 mb-0">
      <router-link to="/login">Back to login</router-link>
    </p>
  </div>
</template>

<script>
export default {
  name: 'ResetPassword',
  data() {
    return {
      token: null,
      password: '',
      confirm: '',
      error: null,
      success: null,
      loading: false
    }
  },
  mounted() {
    const params = new URLSearchParams(window.location.search)
    this.token = params.get('token')
  },
  methods: {
    async submit() {
      this.error = null
      if (!this.password) {
        this.error = 'Please enter a new password.'
        return
      }
      if (this.password !== this.confirm) {
        this.error = 'Passwords do not match.'
        return
      }
      this.loading = true
      const result = await this.$auth.resetPassword(this.token, this.password)
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
