<template>
  <div class="container my-4">
    <h2 class="mb-4">{{ isAdmin ? 'Admin Panel' : 'Team Roster' }}</h2>

    <div v-if="error" class="alert alert-danger">{{ error }}</div>
    <div v-if="success" class="alert alert-success">{{ success }}</div>

    <!-- Events management (admin only) -->
    <div v-if="isAdmin" class="card mb-4">
      <div class="card-header d-flex align-items-center justify-content-between">
        <h5 class="mb-0">Events</h5>
        <div class="d-flex gap-2">
          <input v-model="newEventName" class="form-control form-control-sm" style="width:200px" placeholder="New event name">
          <button class="btn btn-sm btn-primary" @click="addEvent" :disabled="!newEventName.trim()">Add</button>
        </div>
      </div>
      <div class="card-body">
        <div v-if="eventsLoading" class="text-center my-3">
          <div class="spinner-border spinner-border-sm text-primary"></div>
        </div>
        <div v-else-if="events.length === 0" class="text-muted">No events configured.</div>
        <div v-else class="accordion" id="eventsAccordion">
          <div v-for="event in events" :key="event._id" class="accordion-item">
            <h2 class="accordion-header">
              <button class="accordion-button collapsed" type="button"
                      data-bs-toggle="collapse" :data-bs-target="'#event-' + event._id">
                {{ event.name }}
                <span class="badge bg-secondary ms-2">{{ event.topics.length }} topics</span>
              </button>
            </h2>
            <div :id="'event-' + event._id" class="accordion-collapse collapse" data-bs-parent="#eventsAccordion">
              <div class="accordion-body">
                <div class="d-flex flex-wrap gap-1 mb-3">
                  <span v-for="(topic, i) in event.topics" :key="i"
                        class="badge bg-primary d-flex align-items-center gap-1" style="font-size:0.85em">
                    {{ topic.name }}
                    <button class="btn-close btn-close-white" style="font-size:0.5em"
                            @click="removeTopic(event, i)"></button>
                  </span>
                  <span v-if="event.topics.length === 0" class="text-muted">No topics yet</span>
                </div>
                <div class="d-flex gap-2">
                  <input v-model="newTopicNames[event._id]" class="form-control form-control-sm" style="width:200px"
                         placeholder="New topic name" @keyup.enter="addTopic(event)">
                  <button class="btn btn-sm btn-outline-primary" @click="addTopic(event)">Add topic</button>
                  <button class="btn btn-sm btn-outline-danger ms-auto" @click="deleteEvent(event)">Delete event</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

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
            <th v-if="isAdmin">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in users" :key="user.id">
            <td>{{ user.name }}</td>
            <td class="text-muted">{{ user.email }}</td>

            <!-- Role: only admins can change roles -->
            <td>
              <select v-if="isAdmin" class="form-select form-select-sm" style="width:120px"
                      :value="user.role" @change="changeRole(user, $event.target.value)">
                <option value="student">Student</option>
                <option value="captain">Captain</option>
                <option value="admin">Admin</option>
              </select>
              <span v-else class="badge" :class="roleBadge(user.role)">{{ user.role }}</span>
            </td>

            <!-- Permissions: admins edit anyone, captains edit students only -->
            <td>
              <div class="d-flex flex-wrap gap-1">
                <span v-for="perm in allPermissions" :key="perm"
                      class="badge"
                      :class="user.permissions.includes(perm) ? 'bg-primary' : 'bg-light text-dark border'"
                      :style="canEditPerms(user) ? 'cursor:pointer' : 'cursor:default; opacity:0.6'"
                      style="font-size: 0.75em"
                      @click="canEditPerms(user) && togglePermission(user, perm)">
                  {{ perm }}
                </span>
              </div>
            </td>

            <td>
              <span :class="user.verified ? 'text-success' : 'text-danger'">
                {{ user.verified ? 'Yes' : 'No' }}
              </span>
            </td>

            <!-- Delete: admin only -->
            <td v-if="isAdmin">
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
      allPermissions: ['read:db', 'add:db', 'propose:db', 'read:reports', 'manage:db', 'manage:ec', 'manage:c', 'manage:coaches'],
      events: [],
      eventsLoading: true,
      newEventName: '',
      newTopicNames: {}
    }
  },
  computed: {
    currentUserId() {
      return this.$auth.user ? this.$auth.user.id : null
    },
    isAdmin() {
      return this.$auth.user && this.$auth.user.role === 'admin'
    },
    isCaptain() {
      return this.$auth.user && this.$auth.user.role === 'captain'
    }
  },
  async created() {
    await this.loadUsers()
    if (this.isAdmin) await this.loadEvents()
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

    // Captains can only edit permissions on students
    canEditPerms(user) {
      if (this.isAdmin) return true
      if (this.isCaptain && user.role === 'student') return true
      return false
    },

    roleBadge(role) {
      if (role === 'admin') return 'bg-danger'
      if (role === 'captain') return 'bg-warning text-dark'
      return 'bg-secondary'
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
      if (!this.canEditPerms(user)) return
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

    // --- Events ---

    async loadEvents() {
      this.eventsLoading = true
      try {
        this.events = await ServerTalker.getEvents()
      } catch (err) {
        this.error = err.message || 'Failed to load events'
      }
      this.eventsLoading = false
    },

    async addEvent() {
      const name = this.newEventName.trim()
      if (!name) return
      this.clearMessages()
      const result = await ServerTalker.addEvent(name)
      if (result.status) {
        this.newEventName = ''
        await this.loadEvents()
        this.success = `Event "${name}" added`
      } else {
        this.error = result.message
      }
    },

    async addTopic(event) {
      const name = (this.newTopicNames[event._id] || '').trim()
      if (!name) return
      this.clearMessages()
      const topics = [...event.topics, { name }]
      const result = await ServerTalker.updateEvent(event._id, event.name, topics)
      if (result.status) {
        event.topics = topics
        this.$set(this.newTopicNames, event._id, '')
        this.success = `Topic "${name}" added to ${event.name}`
      } else {
        this.error = result.message
      }
    },

    async removeTopic(event, index) {
      this.clearMessages()
      const removed = event.topics[index].name
      const topics = event.topics.filter((_, i) => i !== index)
      const result = await ServerTalker.updateEvent(event._id, event.name, topics)
      if (result.status) {
        event.topics = topics
        this.success = `Topic "${removed}" removed from ${event.name}`
      } else {
        this.error = result.message
      }
    },

    async deleteEvent(event) {
      if (!confirm(`Delete event "${event.name}" and all its topics?`)) return
      this.clearMessages()
      const result = await ServerTalker.deleteEvent(event._id)
      if (result.status) {
        this.events = this.events.filter(e => e._id !== event._id)
        this.success = `Event "${event.name}" deleted`
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
