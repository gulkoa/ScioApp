<template>
  <div class="container my-4">
    <h2 class="mb-4">Leaderboard</h2>

    <!-- Event selector + period tabs -->
    <div class="card card-body mb-4">
      <div class="d-flex align-items-center gap-3 flex-wrap">
        <div class="dropdown">
          <button class="btn dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false" data-bs-toggle="dropdown">
            {{ selectedEvent || 'Select the event' }}
          </button>
          <div class="dropdown-menu">
            <button class="btn dropdown-item" v-for="(event, index) in events" :key="index" @click="selectEvent(event)">{{event.name}}</button>
          </div>
        </div>

        <div class="btn-group" role="group" aria-label="Period">
          <button
            v-for="p in periods" :key="p.key"
            class="btn btn-sm"
            :class="period === p.key ? 'btn-primary' : 'btn-outline-primary'"
            @click="setPeriod(p.key)"
          >{{ p.label }}</button>
        </div>

        <span v-if="periodLabel" class="text-muted">{{ periodLabel }}</span>
        <button
          v-if="anchor"
          class="btn btn-sm btn-outline-secondary"
          @click="backToCurrent"
          title="Back to current period"
        >Back to current</button>
        <span
          class="ms-auto confetti-wrapper"
          :title="isFirstPlace ? '' : 'You must be in 1st place to launch confetti'"
        >
          <button
            class="btn btn-sm confetti-btn"
            :class="isFirstPlace ? 'btn-warning' : 'btn-outline-secondary'"
            :disabled="!isFirstPlace"
            @click="launchConfetti"
          >🎉 Celebrate!</button>
        </span>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center my-5">
      <div class="spinner-border text-primary"></div>
    </div>

    <!-- Empty state -->
    <div v-else-if="selectedEvent && users && users.length === 0" class="text-center text-muted my-5">
      <p class="h5">No submissions {{ emptyPeriodPhrase }}</p>
      <p>Be the first to solve a problem!</p>
    </div>

    <!-- Prompt to select -->
    <div v-else-if="!selectedEvent" class="text-center text-muted my-5">
      <p class="h5">Select an event to see the leaderboard</p>
    </div>

    <!-- Leaderboard -->
    <div v-else-if="users && users.length > 0">

      <!-- Top 3 podium -->
      <div class="d-flex justify-content-center align-items-stretch gap-3 mb-4" v-if="users.length >= 1">

        <!-- 2nd place -->
        <div v-if="users.length >= 2" class="podium-card text-center" style="order:1">
          <div class="podium-visual">
            <img v-if="users[1].picture" :src="users[1].picture" class="podium-avatar" alt="">
            <div class="podium-rank silver">2</div>
            <div class="podium-bar silver-bg" style="height:100px"></div>
          </div>
          <div class="podium-info">
            <p class="fw-bold mb-0"><router-link :to="'/profile/' + users[1].userID" class="text-decoration-none text-reset">{{ users[1].name }}</router-link></p>
            <p class="text-muted small mb-0">{{ users[1].solved }} solved</p>
            <p class="h5 mb-0">{{ users[1].score.toLocaleString() }}</p>
          </div>
        </div>

        <!-- 1st place -->
        <div class="podium-card text-center" style="order:2">
          <div class="podium-visual">
            <img v-if="users[0].picture" :src="users[0].picture" class="podium-avatar podium-avatar-lg" alt="">
            <div class="podium-rank gold">1</div>
            <div class="podium-bar gold-bg" style="height:140px"></div>
          </div>
          <div class="podium-info">
            <p class="fw-bold mb-0"><router-link :to="'/profile/' + users[0].userID" class="text-decoration-none text-reset">{{ users[0].name }}</router-link></p>
            <p class="text-muted small mb-0">{{ users[0].solved }} solved</p>
            <p class="h4 mb-0">{{ users[0].score.toLocaleString() }}</p>
          </div>
        </div>

        <!-- 3rd place -->
        <div v-if="users.length >= 3" class="podium-card text-center" style="order:3">
          <div class="podium-visual">
            <img v-if="users[2].picture" :src="users[2].picture" class="podium-avatar" alt="">
            <div class="podium-rank bronze">3</div>
            <div class="podium-bar bronze-bg" style="height:70px"></div>
          </div>
          <div class="podium-info">
            <p class="fw-bold mb-0"><router-link :to="'/profile/' + users[2].userID" class="text-decoration-none text-reset">{{ users[2].name }}</router-link></p>
            <p class="text-muted small mb-0">{{ users[2].solved }} solved</p>
            <p class="h5 mb-0">{{ users[2].score.toLocaleString() }}</p>
          </div>
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
                <router-link :to="'/profile/' + user.userID" class="text-decoration-none text-reset">{{ user.name }}</router-link>
              </td>
              <td class="text-center">{{ user.solved }}</td>
              <td class="text-center text-muted">{{ formatAvgTime(user) }}</td>
              <td class="text-end">{{ user.score.toLocaleString() }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Tiny calendar of past winners -->
    <div v-if="selectedEvent && history && history.length > 0" class="mt-5">
      <h5 class="mb-3">
        {{ period === 'month' ? 'Monthly Champions' : 'Weekly Champions' }}
        <small class="text-muted fw-normal">— who took 1st each {{ period }}</small>
      </h5>
      <p class="text-muted small mb-2">Click a {{ period }} to view that leaderboard.</p>
      <div class="calendar-grid">
        <button
          type="button"
          v-for="(cell, idx) in history"
          :key="idx"
          class="calendar-cell"
          :class="{
            'calendar-cell-current': idx === 0,
            'calendar-cell-empty': !cell.winner,
            'calendar-cell-active': isActiveCell(cell, idx)
          }"
          :title="cellTooltip(cell)"
          @click="selectHistoryCell(cell)"
        >
          <div class="calendar-label">{{ cellLabel(cell) }}</div>
          <img v-if="cell.winner && cell.winner.picture" :src="cell.winner.picture" class="calendar-avatar" alt="">
          <div v-else-if="cell.winner" class="calendar-avatar calendar-avatar-fallback">
            {{ (cell.winner.name || '?').charAt(0).toUpperCase() }}
          </div>
          <div v-else class="calendar-avatar calendar-avatar-empty">—</div>
          <div v-if="cell.winner" class="calendar-name text-truncate">{{ cell.winner.name }}</div>
          <div v-else class="calendar-name text-muted">no winner</div>
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import ServerTalker from '../ServerTalker'
import { saveEventName, findSavedEvent } from '../eventStore'
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
      periodLabel: null,
      loading: false,
      period: 'week',
      // Anchor timestamp for the period being viewed (null = current period).
      // Updated when a user clicks a calendar tile.
      anchor: null,
      history: [],
      periods: [
        { key: 'week',  label: 'Weekly' },
        { key: 'month', label: 'Monthly' },
        { key: 'all',   label: 'All Time' }
      ]
    }
  },
  computed: {
    currentUserId() {
      return this.$auth.user ? this.$auth.user.id : null
    },
    isFirstPlace() {
      return this.users && this.users.length > 0 && this.currentUserId === this.users[0].userID
    },
    emptyPeriodPhrase() {
      if (this.period === 'week')  return 'this week'
      if (this.period === 'month') return 'this month'
      return 'yet'
    }
  },
  async mounted() {
    this.events = await ServerTalker.getEvents()
    const saved = findSavedEvent(this.events)
    if (saved) this.selectEvent(saved)
  },
  methods: {
    selectEvent(event) {
      this.selectedEvent = event.name
      saveEventName(event.name)
      this.loadLeaderboard()
    },

    setPeriod(p) {
      if (this.period === p) return
      this.period = p
      this.anchor = null
      if (this.selectedEvent) this.loadLeaderboard()
    },

    backToCurrent() {
      this.anchor = null
      this.loadLeaderboard()
    },

    selectHistoryCell(cell) {
      // Don't reload if it's already the active period
      if (cell.start === this.anchor) return
      // idx 0 is the current period — clear anchor so future "now" requests
      // stay accurate even if the page sits open across a week boundary.
      const idx = this.history.indexOf(cell)
      this.anchor = idx === 0 ? null : cell.start
      this.loadLeaderboard()
    },

    async loadLeaderboard() {
      this.loading = true
      try {
        const data = await ServerTalker.getRanking(this.selectedEvent, this.period, this.anchor)
        this.users = data.users
        this.history = data.history || []

        if (this.period === 'all') {
          this.periodLabel = 'All time'
        } else if (data.periodStart) {
          const start = new Date(data.periodStart)
          const end = new Date(data.periodEnd)
          end.setDate(end.getDate() - 1)
          if (this.period === 'month') {
            this.periodLabel = start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
          } else {
            const fmt = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            this.periodLabel = `${fmt(start)} – ${fmt(end)}`
          }
        } else {
          this.periodLabel = null
        }
      } catch (err) {
        this.users = []
        this.history = []
      }
      this.loading = false
    },

    isActiveCell(cell, idx) {
      if (this.anchor) return cell.start === this.anchor
      // No anchor → current period (idx 0) is the one being shown
      return idx === 0
    },

    cellLabel(cell) {
      const start = new Date(cell.start)
      if (this.period === 'month') {
        return start.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
      }
      // Weekly: show "Mon DD"
      return start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    },

    cellTooltip(cell) {
      const start = new Date(cell.start)
      const end = new Date(cell.end)
      end.setDate(end.getDate() - 1)
      const fmt = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      const range = this.period === 'month'
        ? start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        : `${fmt(start)} – ${fmt(end)}`
      if (!cell.winner) return `${range} — no winner`
      return `${range}\n🥇 ${cell.winner.name} — ${cell.winner.score.toLocaleString()} pts (${cell.winner.solved} solved)`
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
  display: flex;
  flex-direction: column;
}
/* Visual stack: avatar + rank + bar — bottom-aligned so all bars share a baseline */
.podium-visual {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  /* Tallest bar (140) + rank (40 + 8 margin) + avatar (64 + 4 margin) = ~256 */
  height: 260px;
}
.podium-info {
  margin-top: 8px;
  /* Reserve consistent vertical space so wrapped names don't push bars up */
  min-height: 90px;
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
.confetti-wrapper {
  display: inline-block;
  cursor: not-allowed;
}
.confetti-btn:disabled {
  opacity: 0.4;
  pointer-events: none;
}
.table-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  object-fit: cover;
  vertical-align: middle;
}

/* Tiny calendar of past winners */
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 8px;
}
.calendar-cell {
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 6px 4px;
  text-align: center;
  background: #fff;
  transition: transform 0.1s ease, box-shadow 0.1s ease;
  cursor: pointer;
  font: inherit;
  color: inherit;
}
.calendar-cell:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.08);
}
.calendar-cell-current {
  border-color: #FFD700;
  background: linear-gradient(180deg, #FFFBE6 0%, #FFFFFF 60%);
}
.calendar-cell-active {
  box-shadow: 0 0 0 2px #0d6efd;
  border-color: #0d6efd;
}
.calendar-cell-current.calendar-cell-active {
  box-shadow: 0 0 0 2px #0d6efd, 0 0 0 4px rgba(255, 215, 0, 0.35);
}
.calendar-cell-empty {
  opacity: 0.55;
}
.calendar-label {
  font-size: 0.7rem;
  font-weight: 600;
  color: #6c757d;
  margin-bottom: 4px;
  white-space: nowrap;
}
.calendar-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #dee2e6;
  display: inline-block;
}
.calendar-avatar-fallback {
  background: #6c757d;
  color: #fff;
  font-weight: bold;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
}
.calendar-avatar-empty {
  background: #f1f3f5;
  color: #adb5bd;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.calendar-name {
  font-size: 0.7rem;
  margin-top: 4px;
  max-width: 100%;
}
</style>
