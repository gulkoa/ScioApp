<template>
  <div>
   <div class="card pCard p-4 text-center m-auto my-3">
      <img :src="$auth.user.picture" alt="userPicture" class="rounded-circle m-auto mb-4" width="128" height="128">
      <p class="h4 center m-1">{{$auth.user.name}}</p>
      <p class="center text-muted m-1">Please visit <a href="https://en.gravatar.com/">Gravatar</a> to change your avatar</p>
      <p class="center text-muted m-1">UserId: {{$auth.user.sub}}</p>
   </div>
  </div>
</template>

<script>
export default {
  name: 'Profile',
  props: {
    userID: String
  },
}
</script>

<style>
  .pCard {
    width: fit-content;
  }
</style>