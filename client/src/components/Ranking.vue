<template>
  <div class="container my-4">
    <h2 class="mb-4">Weekly Leaderboard</h2>

    <!-- Event selector -->
    <div class="card card-body mb-4">
      <div class="d-flex align-items-center gap-3 flex-wrap">
        <label class="fw-bold mb-0">Event:</label>
        <div class="dropdown">
          <button class="btn btn-outline-primary dropdown-toggle" data-bs-toggle="dropdown">
            {{ selectedEvent || 'Select event' }}
          </button>
          <div class="dropdown-menu">
            <button class="dropdown-item" v-for="event in events" :key="event.name"
                    @click="selectEvent(event)">{{ event.name }}</button>
          </div>
        </div>
        <span v-if="weekLabel" class="text-muted">{{ weekLabel }}</span>
        <button
          class="btn btn-sm ms-auto confetti-btn"
          :class="isFirstPlace ? 'btn-warning' : 'btn-outline-secondary'"
          :disabled="!isFirstPlace"
          title="You must be in 1st place to launch confetti"
          @click="launchConfetti"
        >🎉 Celebrate!</button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center my-5">
      <div class="spinner-border text-primary"></div>
    </div>

    <!-- Empty state -->
    <div v-else-if="selectedEvent && users && users.length === 0" class="text-center text-muted my-5">
      <p class="h5">No submissions this week</p>
      <p>Be the first to solve a problem!</p>
    </div>

    <!-- Prompt to select -->
    <div v-else-if="!selectedEvent" class="text-center text-muted my-5">
      <p class="h5">Select an event to see the leaderboard</p>
    </div>

    <!-- Leaderboard -->
    <div v-else-if="users && users.length > 0">

      <!-- Top 3 podium -->
      <div class="d-flex justify-content-center align-items-end gap-3 mb-4" v-if="users.length >= 1">

        <!-- 2nd place -->
        <div v-if="users.length >= 2" class="podium-card text-center" style="order:1">
          <img v-if="users[1].picture" :src="users[1].picture" class="podium-avatar" alt="">
          <div class="podium-rank silver">2</div>
          <div class="podium-bar silver-bg" style="height:100px"></div>
          <p class="fw-bold mb-0 mt-2">{{ users[1].name }}</p>
          <p class="text-muted small mb-0">{{ users[1].solved }} solved</p>
          <p class="h5 mb-0">{{ users[1].score.toLocaleString() }}</p>
        </div>

        <!-- 1st place -->
        <div class="podium-card text-center" style="order:2">
          <img v-if="users[0].picture" :src="users[0].picture" class="podium-avatar podium-avatar-lg" alt="">
          <div class="podium-rank gold">1</div>
          <div class="podium-bar gold-bg" style="height:140px"></div>
          <p class="fw-bold mb-0 mt-2">{{ users[0].name }}</p>
          <p class="text-muted small mb-0">{{ users[0].solved }} solved</p>
          <p class="h4 mb-0">{{ users[0].score.toLocaleString() }}</p>
        </div>

        <!-- 3rd place -->
        <div v-if="users.length >= 3" class="podium-card text-center" style="order:3">
          <img v-if="users[2].picture" :src="users[2].picture" class="podium-avatar" alt="">
          <div class="podium-rank bronze">3</div>
          <div class="podium-bar bronze-bg" style="height:70px"></div>
          <p class="fw-bold mb-0 mt-2">{{ users[2].name }}</p>
          <p class="text-muted small mb-0">{{ users[2].solved }} solved</p>
          <p class="h5 mb-0">{{ users[2].score.toLocaleString() }}</p>
        </div>
      </div>

      <!-- Rest of the leaderboard -->
      <div v-if="users.length > 3" class="card">
        <table class="table table-hover mb-0 align-middle">
          <thead class="table-light">
            <tr>
              <th style="width:60px" class="text-center">#</th>
              <th>Name</th>
              <th class="text-center">Solved</th>
              <th class="text-center">Avg Time</th>
              <th class="text-end">Score</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(user, index) in users.slice(3)" :key="user.userID"
                :class="{ 'table-info': user.userID === currentUserId }">
              <td class="text-center text-muted">{{ index + 4 }}</td>
              <td class="fw-bold">
                <img v-if="user.picture" :src="user.picture" class="table-avatar me-2" alt="">
                {{ user.name }}
              </td>
              <td class="text-center">{{ user.solved }}</td>
              <td class="text-center text-muted">{{ formatAvgTime(user) }}</td>
              <td class="text-end">{{ user.score.toLocaleString() }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script>
import ServerTalker from '../ServerTalker'
import confetti from 'canvas-confetti'

export default {
  name: 'Ranking',
  props: {
    userID: String
  },
  data() {
    return {
      events: [],
      selectedEvent: null,
      users: null,
      weekLabel: null,
      loading: false
    }
  },
  computed: {
    currentUserId() {
      return this.$auth.user ? this.$auth.user.id : null
    },
    isFirstPlace() {
      return this.users && this.users.length > 0 && this.currentUserId === this.users[0].userID
    }
  },
  async mounted() {
    this.events = await ServerTalker.getEvents()
  },
  methods: {
    async selectEvent(event) {
      this.selectedEvent = event.name
      this.loading = true
      try {
        const data = await ServerTalker.getRanking(event.name)
        this.users = data.users

        // Format week range for display
        if (data.weekStart) {
          const start = new Date(data.weekStart)
          const end = new Date(data.weekEnd)
          end.setDate(end.getDate() - 1) // Show Sunday, not next Monday
          const fmt = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          this.weekLabel = `${fmt(start)} – ${fmt(end)}`
        }
      } catch (err) {
        this.users = []
      }
      this.loading = false
    },

    launchConfetti() {
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#FFD700', '#FFA000', '#FF6B6B', '#4CAF50', '#2196F3']
      })
    },

    formatAvgTime(user) {
      if (!user.solved || !user.totalTime) return '—'
      const avg = user.totalTime / user.solved / 10 // convert from tenths to seconds
      const m = Math.floor(avg / 60)
      const s = Math.round(avg % 60)
      return m > 0 ? `${m}m ${s}s` : `${s}s`
    }
  }
}
</script>

<style scoped>
.podium-card {
  width: 140px;
}
.podium-rank {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 8px;
  font-weight: bold;
  font-size: 1.1em;
  color: white;
}
.podium-bar {
  border-radius: 8px 8px 0 0;
  margin: 0 auto;
  width: 80%;
}
.gold    { background: #FFD700; color: #333; }
.gold-bg { background: linear-gradient(180deg, #FFD700, #FFA000); }
.silver    { background: #C0C0C0; color: #333; }
.silver-bg { background: linear-gradient(180deg, #C0C0C0, #909090); }
.bronze    { background: #CD7F32; }
.bronze-bg { background: linear-gradient(180deg, #CD7F32, #A0522D); }
.podium-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #dee2e6;
  margin-bottom: 4px;
}
.podium-avatar-lg {
  width: 64px;
  height: 64px;
  border-width: 3px;
}
.confetti-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.table-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  object-fit: cover;
  vertical-align: middle;
}
</style>
