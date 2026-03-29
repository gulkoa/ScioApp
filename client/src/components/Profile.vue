<template>
  <div class="profile-wrap mx-auto my-3">
    <!-- Profile card -->
    <div class="card p-4 text-center mb-3">
      <img :src="$auth.user.picture" alt="avatar" class="rounded-circle m-auto mb-4" width="128" height="128">
      <p class="h4 center m-1">{{ $auth.user.name }}</p>
      <p class="center text-muted m-1">{{ $auth.user.email }}</p>
      <p class="center m-1"><span class="badge bg-primary">{{ $auth.user.role }}</span></p>
      <p class="center text-muted m-1 mt-2">
        Change your avatar at <a href="https://gravatar.com" target="_blank">Gravatar</a>
      </p>
    </div>

    <!-- Change name -->
    <div class="card p-4 mb-3">
      <h5 class="mb-3">Change Display Name</h5>
      <div v-if="nameError" class="alert alert-danger py-2">{{ nameError }}</div>
      <div v-if="nameSuccess" class="alert alert-success py-2">{{ nameSuccess }}</div>
      <div class="mb-3">
        <label class="form-label">New Name</label>
        <input v-model="newName" type="text" class="form-control" :placeholder="$auth.user.name" @keyup.enter="submitName">
      </div>
      <button class="btn btn-primary" :disabled="nameLoading" @click="submitName">
        {{ nameLoading ? 'Saving...' : 'Save Name' }}
      </button>
    </div>

    <!-- Change password -->
    <div class="card p-4 mb-3">
      <h5 class="mb-3">Change Password</h5>
      <div v-if="pwError" class="alert alert-danger py-2">{{ pwError }}</div>
      <div v-if="pwSuccess" class="alert alert-success py-2">{{ pwSuccess }}</div>
      <div class="mb-3">
        <label class="form-label">Current Password</label>
        <input v-model="currentPassword" type="password" class="form-control" @keyup.enter="submitPassword">
      </div>
      <div class="mb-3">
        <label class="form-label">New Password</label>
        <input v-model="newPassword" type="password" class="form-control" placeholder="At least 6 characters" @keyup.enter="submitPassword">
      </div>
      <div class="mb-3">
        <label class="form-label">Confirm New Password</label>
        <input v-model="confirmPassword" type="password" class="form-control" @keyup.enter="submitPassword">
      </div>
      <button class="btn btn-primary" :disabled="pwLoading" @click="submitPassword">
        {{ pwLoading ? 'Updating...' : 'Update Password' }}
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Profile',
  props: {
    userID: String
  },
  data() {
    return {
      newName: '',
      nameError: null,
      nameSuccess: null,
      nameLoading: false,

      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
      pwError: null,
      pwSuccess: null,
      pwLoading: false
    }
  },
  methods: {
    async submitName() {
      this.nameError = null
      this.nameSuccess = null
      if (!this.newName.trim()) {
        this.nameError = 'Please enter a name.'
        return
      }
      this.nameLoading = true
      const result = await this.$auth.changeName(this.newName.trim())
      if (result.status) {
        this.nameSuccess = 'Name updated successfully.'
        this.newName = ''
      } else {
        this.nameError = result.message
      }
      this.nameLoading = false
    },

    async submitPassword() {
      this.pwError = null
      this.pwSuccess = null
      if (!this.currentPassword || !this.newPassword) {
        this.pwError = 'Please fill in all password fields.'
        return
      }
      if (this.newPassword !== this.confirmPassword) {
        this.pwError = 'New passwords do not match.'
        return
      }
      this.pwLoading = true
      const result = await this.$auth.changePassword(this.currentPassword, this.newPassword)
      if (result.status) {
        this.pwSuccess = 'Password changed successfully.'
        this.currentPassword = ''
        this.newPassword = ''
        this.confirmPassword = ''
      } else {
        this.pwError = result.message
      }
      this.pwLoading = false
    }
  }
}
</script>

<style scoped>
.profile-wrap {
  max-width: 480px;
}
</style>
