<template>
  <div class="auth-card card p-4 m-auto my-5">
    <h3 class="text-center mb-4">Create an account</h3>

    <div v-if="error" class="alert alert-danger">{{ error }}</div>

    <template v-if="!success">
      <div class="mb-3">
        <label class="form-label">Name</label>
        <input v-model="name" type="text" class="form-control" placeholder="Your name" @keyup.enter="submit">
      </div>

      <div class="mb-3">
        <label class="form-label">Email</label>
        <input v-model="email" type="email" class="form-control" placeholder="you@example.com" @keyup.enter="submit">
      </div>

      <div class="mb-3">
        <label class="form-label">Password</label>
        <input v-model="password" type="password" class="form-control" placeholder="At least 6 characters" @keyup.enter="submit">
      </div>

      <button class="btn btn-primary w-100" :disabled="loading" @click="submit">
        {{ loading ? 'Creating account...' : 'Sign up' }}
      </button>

      <p class="text-center mt-3 mb-0">
        Already have an account? <router-link to="/login">Log in</router-link>
      </p>
    </template>

    <div v-else class="text-center">
      <div class="alert alert-success">{{ success }}</div>
      <p class="text-muted">Check your inbox and click the verification link to activate your account.</p>
      <router-link to="/login" class="btn btn-primary mt-2">Go to login</router-link>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Register',
  data() {
    return {
      name: '',
      email: '',
      password: '',
      error: null,
      success: null,
      loading: false
    }
  },
  methods: {
    async submit() {
      this.error = null

      if (!this.name.trim()) {
        this.error = 'Please enter your name.'
        return
      }
      if (!this.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email)) {
        this.error = 'Please enter a valid email address.'
        return
      }
      if (this.password.length < 6) {
        this.error = 'Password must be at least 6 characters.'
        return
      }

      this.loading = true
      const result = await this.$auth.register(this.name.trim(), this.email, this.password)
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
