<template>
  <div class="m-1">
      <p class="h5">Group mode</p>
    <div class="" v-if="!isInGroupMode">
      <button class="m-1">Create</button>
      <div class="hstack">
        <input type="text" class="" v-model="groupCode" placeholder="Group code">
        <button class="m-1">Join</button>
      </div>
    </div>
    <div class="container-fluid" v-if="isInGroupMode">
    </div>

  </div>
</template>

<script>
export default {
    data() {
        return {
            groupCode: '',
        }
    },
    methods: {
        createGroup() {
            this.$router.push('/create-group')
        },
        joinGroup() {
            this.$router.push('/join-group')
        },
    },
    computed: {
        isInGroupMode() {
            return this.$cookie.get('groupMode')
        },
    }
}
</script>

<style>

</style>