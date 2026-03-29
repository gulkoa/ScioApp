<template>
  <div class="auth-card card p-4 m-auto my-5">
    <h3 class="text-center mb-4">Create an account</h3>

    <div v-if="error" class="alert alert-danger">{{ error }}</div>
    <div v-if="success" class="alert alert-success">{{ success }}</div>

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
      Already have an account? <a href="/login">Log in</a>
    </p>
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
      this.success = null
      this.loading = true

      const result = await this.$auth.register(this.name, this.email, this.password)

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
