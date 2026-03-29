<template>
  <header class="p-1 border-bottom">
    <div class="container">
      <div class="d-flex flex-wrap align-items-center justify-content-center justify-content-lg-start">

        <img v-if="isNats" src="../assets/gold tape.png" style="height: 90px" class="me-5">

        <a href="/" class="d-flex align-items-center m-2 me-5">
          <img src="../assets/ScioApp logo.png" style="height: 42px">
        </a>

        <ul class="nav col-12 col-lg-auto me-lg-auto mb-2 justify-content-center mb-md-0">
          <li><a href="/" class="nav-link px-2 link-secondary">Feed</a></li>
          <li><a href="/question/library" class="nav-link px-2 link-secondary">Library</a></li>
          <li><a href="/question/editor" class="nav-link px-2 link-secondary">Editor</a></li>
          <li><a href="/test/library" class="nav-link px-2 link-secondary">Tests</a></li>
          <li><a href="/MADTON" class="nav-link px-2 link-secondary">MADTON</a></li>
          <li v-if="isAdmin"><a href="/admin" class="nav-link px-2 link-danger">Admin</a></li>
        </ul>

        <div v-if="!$auth.loading">
          <!-- Logged in -->
          <div v-if="$auth.isAuthenticated" class="dropdown text-end">
            <a href="#" class="d-block link-dark text-decoration-none dropdown-toggle" id="dropdownUser1" data-bs-toggle="dropdown" aria-expanded="false">
              <img :src="$auth.user.picture" alt="" class="rounded-circle" width="32" height="32">
              <span class="p-2">{{ $auth.user.name }}</span>
            </a>
            <ul class="dropdown-menu text-small p-1" aria-labelledby="dropdownUser1">
              <li><a class="dropdown-item" href="/profile">Profile</a></li>
              <li><button class="dropdown-item" @click="logout">Sign out</button></li>
            </ul>
          </div>

          <!-- Not logged in -->
          <div v-else class="text-end">
            <a href="/login" class="btn btn-outline-primary me-2">Log in</a>
            <a href="/register" class="btn btn-primary">Sign up</a>
          </div>
        </div>

      </div>
    </div>
  </header>
</template>

<script>
export default {
  methods: {
    logout() {
      this.$auth.logout()
    }
  },
  computed: {
    isAdmin() {
      return this.$auth.isAuthenticated && this.$auth.user && ['admin', 'captain'].includes(this.$auth.user.role)
    },
    isNats() {
      const month = new Date().getMonth() + 1
      return month >= 3 && month <= 5
    }
  }
}
</script>
