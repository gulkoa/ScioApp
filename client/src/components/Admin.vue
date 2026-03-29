<template>
  <div class="container my-4">
    <h2 class="mb-4">Admin Panel</h2>

    <div v-if="error" class="alert alert-danger">{{ error }}</div>
    <div v-if="success" class="alert alert-success">{{ success }}</div>

    <div v-if="loading" class="text-center my-5">
      <div class="spinner-border text-primary"></div>
    </div>

    <!-- Users table -->
    <div v-else class="table-responsive">
      <table class="table table-hover align-middle">
        <thead class="table-light">
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Permissions</th>
            <th>Verified</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in users" :key="user.id">
            <td>{{ user.name }}</td>
            <td class="text-muted">{{ user.email }}</td>

            <!-- Role dropdown -->
            <td>
              <select class="form-select form-select-sm" style="width:120px"
                      :value="user.role" @change="changeRole(user, $event.target.value)">
                <option value="student">Student</option>
                <option value="coach">Coach</option>
                <option value="admin">Admin</option>
              </select>
            </td>

            <!-- Permission checkboxes -->
            <td>
              <div class="d-flex flex-wrap gap-1">
                <span v-for="perm in allPermissions" :key="perm"
                      class="badge"
                      :class="user.permissions.includes(perm) ? 'bg-primary' : 'bg-light text-dark border'"
                      style="cursor:pointer; font-size: 0.75em"
                      @click="togglePermission(user, perm)">
                  {{ perm }}
                </span>
              </div>
            </td>

            <td>
              <span :class="user.verified ? 'text-success' : 'text-danger'">
                {{ user.verified ? 'Yes' : 'No' }}
              </span>
            </td>

            <td>
              <button class="btn btn-sm btn-outline-danger"
                      v-if="user.id !== currentUserId"
                      @click="removeUser(user)">
                Delete
              </button>
              <span v-else class="text-muted">You</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script>
import ServerTalker from '../ServerTalker'

export default {
  name: 'Admin',
  props: {
    userID: String
  },
  data() {
    return {
      users: [],
      loading: true,
      error: null,
      success: null,
      allPermissions: ['read:db', 'add:db', 'propose:db', 'read:reports', 'manage:db', 'manage:ec', 'manage:c', 'manage:coaches']
    }
  },
  computed: {
    currentUserId() {
      return this.$auth.user ? this.$auth.user.id : null
    }
  },
  async created() {
    await this.loadUsers()
  },
  methods: {
    async loadUsers() {
      this.loading = true
      try {
        const data = await ServerTalker.getUsers()
        this.users = data.users
      } catch (err) {
        this.error = err.message || 'Failed to load users'
      }
      this.loading = false
    },

    async changeRole(user, role) {
      this.clearMessages()
      const result = await ServerTalker.updateUserRole(user.id, role)
      if (result.status) {
        user.role = role
        this.success = `${user.name} is now a ${role}`
      } else {
        this.error = result.message
      }
    },

    async togglePermission(user, perm) {
      this.clearMessages()
      const perms = user.permissions.includes(perm)
        ? user.permissions.filter(p => p !== perm)
        : [...user.permissions, perm]

      const result = await ServerTalker.updateUserPermissions(user.id, perms)
      if (result.status) {
        user.permissions = perms
      } else {
        this.error = result.message
      }
    },

    async removeUser(user) {
      if (!confirm(`Delete ${user.name} (${user.email})?`)) return
      this.clearMessages()
      const result = await ServerTalker.deleteUser(user.id)
      if (result.status) {
        this.users = this.users.filter(u => u.id !== user.id)
        this.success = `${user.name} deleted`
      } else {
        this.error = result.message
      }
    },

    clearMessages() {
      this.error = null
      this.success = null
    }
  }
}
</script>
