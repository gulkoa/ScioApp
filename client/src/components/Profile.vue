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

    <!-- Event Performance -->
    <div class="card p-4 mb-3">
      <h5 class="mb-3">Event Performance</h5>
      <div v-if="perfLoading" class="text-muted">Loading performance data...</div>
      <div v-else-if="perfError" class="alert alert-danger py-2">{{ perfError }}</div>
      <div v-else-if="performance.length === 0" class="text-muted">No submissions yet. Start solving questions to see your stats!</div>
      <div v-else>
        <div class="table-responsive">
          <table class="table table-sm mb-0">
            <thead>
              <tr>
                <th>Event</th>
                <th class="text-center">Solved</th>
                <th class="text-center">Attempts</th>
                <th class="text-center">Accuracy</th>
                <th class="text-center">Avg Time</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in performance" :key="p.event">
                <td>{{ p.event }}</td>
                <td class="text-center">{{ p.correct }}</td>
                <td class="text-center">{{ p.totalAttempts }}</td>
                <td class="text-center">
                  <span :class="accuracyClass(p.accuracy)">{{ p.accuracy }}%</span>
                </td>
                <td class="text-center">{{ formatTime(p.avgTime) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="mt-3 pt-2 border-top d-flex justify-content-between text-muted small">
          <span>Total solved: {{ totalSolved }}</span>
          <span>Overall accuracy: {{ overallAccuracy }}%</span>
        </div>
      </div>
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

    <!-- Delete account -->
    <div class="card p-4 mb-3 border-danger">
      <h5 class="mb-3 text-danger">Delete Account</h5>
      <p class="text-muted small">This permanently deletes your account and cannot be undone.</p>
      <div v-if="deleteError" class="alert alert-danger py-2">{{ deleteError }}</div>
      <div v-if="!confirmDelete">
        <button class="btn btn-outline-danger" @click="confirmDelete = true">Delete my account</button>
      </div>
      <div v-else>
        <p class="text-danger small fw-bold">Are you sure? This action is irreversible.</p>
        <button class="btn btn-danger me-2" :disabled="deleteLoading" @click="submitDelete">
          {{ deleteLoading ? 'Deleting...' : 'Yes, delete my account' }}
        </button>
        <button class="btn btn-secondary" @click="confirmDelete = false">Cancel</button>
      </div>
    </div>
  </div>
</template>

<script>
import ServerTalker from '../ServerTalker'

export default {
  name: 'Profile',
  props: {
    userID: String
  },
  data() {
    return {
      performance: [],
      perfLoading: true,
      perfError: null,

      newName: '',
      nameError: null,
      nameSuccess: null,
      nameLoading: false,

      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
      pwError: null,
      pwSuccess: null,
      pwLoading: false,

      confirmDelete: false,
      deleteError: null,
      deleteLoading: false
    }
  },
  computed: {
    totalSolved() {
      return this.performance.reduce((sum, p) => sum + p.correct, 0)
    },
    overallAccuracy() {
      const total = this.performance.reduce((sum, p) => sum + p.totalAttempts, 0)
      const correct = this.performance.reduce((sum, p) => sum + p.correct, 0)
      return total > 0 ? Math.round((correct / total) * 100) : 0
    }
  },
  async created() {
    try {
      const data = await ServerTalker.getPerformance()
      this.performance = data.performance
    } catch (err) {
      this.perfError = 'Could not load performance data.'
    }
    this.perfLoading = false
  },
  methods: {
    formatTime(time) {
      if (!time) return '-'
      const seconds = time / 10
      if (seconds < 60) return Math.round(seconds) + 's'
      const m = Math.floor(seconds / 60)
      const s = Math.round(seconds % 60)
      return m + 'm ' + s + 's'
    },
    accuracyClass(accuracy) {
      if (accuracy >= 80) return 'text-success fw-bold'
      if (accuracy >= 50) return 'text-warning fw-bold'
      return 'text-danger fw-bold'
    },
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
    },

    async submitDelete() {
      this.deleteError = null
      this.deleteLoading = true
      const result = await this.$auth.deleteAccount()
      if (result.status) {
        window.location.href = '/'
      } else {
        this.deleteError = result.message
        this.confirmDelete = false
      }
      this.deleteLoading = false
    }
  }
}
</script>

<style scoped>
.profile-wrap {
  max-width: 480px;
}
</style>
