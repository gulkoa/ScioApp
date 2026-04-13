<template>
  <div class="profile-wrap mx-auto my-3">
    <!-- Back button -->
    <div class="mb-3">
      <router-link to="/ranking" class="btn btn-outline-secondary btn-sm">&larr; Back to Leaderboard</router-link>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center my-5">
      <div class="spinner-border text-primary"></div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="alert alert-danger">{{ error }}</div>

    <template v-else-if="user">
      <!-- Profile card -->
      <div class="card p-4 text-center mb-3">
        <img :src="user.picture" alt="avatar" class="rounded-circle m-auto mb-4" width="128" height="128">
        <p class="h4 center m-1">{{ user.name }}</p>
        <p v-if="user.createdAt" class="center text-muted m-1 mt-2 small">
          Member since {{ formatDate(user.createdAt) }}
        </p>
      </div>

      <!-- Event Performance -->
      <div class="card p-4 mb-3">
        <h5 class="mb-3">Event Performance</h5>
        <div v-if="performance.length === 0" class="text-muted">No submissions yet.</div>
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
    </template>
  </div>
</template>

<script>
import ServerTalker from '../ServerTalker'

export default {
  name: 'PublicProfile',
  props: {
    userID: String,
    prop: String
  },
  data() {
    return {
      user: null,
      performance: [],
      loading: true,
      error: null
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
      const data = await ServerTalker.getPublicProfile(this.prop)
      this.user = data.user
      this.performance = data.performance
    } catch (err) {
      this.error = 'Could not load profile.'
    }
    this.loading = false
  },
  methods: {
    formatDate(dateStr) {
      const d = new Date(dateStr)
      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    },
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
    }
  }
}
</script>

<style scoped>
.profile-wrap {
  max-width: 480px;
}
</style>
