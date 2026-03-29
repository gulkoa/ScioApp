<template>
  <div>
    <div class="card pCard p-4 text-center m-auto my-3">
      <img :src="$auth.user.picture" alt="avatar" class="rounded-circle m-auto mb-4" width="128" height="128">
      <p class="h4 center m-1">{{ $auth.user.name }}</p>
      <p class="center text-muted m-1">{{ $auth.user.email }}</p>
      <p class="center m-1"><span class="badge bg-primary">{{ $auth.user.role }}</span></p>
      <p class="center text-muted m-1 mt-2">
        Change your avatar at <a href="https://gravatar.com" target="_blank">Gravatar</a>
      </p>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Profile',
  props: {
    userID: String
  }
}
</script>

<style>
  .pCard {
    width: fit-content;
  }
</style>
