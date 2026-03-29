<template>
  <div>
    <div class="card pCard p-4 text-center m-auto my-3">
      <!-- User initial as avatar -->
      <div class="avatar rounded-circle m-auto mb-4 d-flex align-items-center justify-content-center">
        <span class="h1 text-white mb-0">{{ initial }}</span>
      </div>
      <p class="h4 center m-1">{{ $auth.user.name }}</p>
      <p class="center text-muted m-1">{{ $auth.user.email }}</p>
      <p class="center m-1"><span class="badge bg-primary">{{ $auth.user.role }}</span></p>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Profile',
  props: {
    userID: String
  },
  computed: {
    initial() {
      return this.$auth.user ? this.$auth.user.name.charAt(0).toUpperCase() : '?'
    }
  }
}
</script>

<style>
  .pCard {
    width: fit-content;
  }
  .avatar {
    width: 96px;
    height: 96px;
    background: #0d6efd;
  }
</style>
