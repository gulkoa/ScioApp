<template>
  <div class="card p-4 m-auto my-5 text-center" style="max-width: 500px">
    <div v-if="loading" class="lds-ripple"><div></div><div></div></div>
    <div v-else>
      <h3 :class="success ? 'text-success' : 'text-danger'">{{ message }}</h3>
      <a v-if="success" href="/login" class="btn btn-primary mt-3">Log in</a>
      <a v-else href="/" class="btn btn-secondary mt-3">Go home</a>
    </div>
  </div>
</template>

<script>
import axios from 'axios'

export default {
  name: 'Verify',
  data() {
    return {
      loading: true,
      success: false,
      message: ''
    }
  },
  async mounted() {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')

    if (!token) {
      this.message = 'Invalid verification link'
      this.loading = false
      return
    }

    try {
      const url = window.location.protocol + '//' + window.location.host + '/api/auth/verify?token=' + token
      const res = await axios.get(url)
      this.success = res.data.status
      this.message = res.data.message
    } catch {
      this.message = 'Verification failed'
    }
    this.loading = false
  }
}
</script>
