<template>
  <div>
      <div class="card card-body p-4 hstack gap-3">
        <div class="dropdown">
                <button class="btn dropdown-toggle" data-toggle="dropdown" data-bs-toggle="dropdown">
                {{ selectedEvent }}
                </button>
                <div class="dropdown-menu">
                <button class="btn dropdown-item" :key="event.name" v-for="(event) in events" @click="selectEvent(event)">{{ event.name }}</button>
                </div>
        </div>
      </div>

        <div v-for="(user, index) in users" :key="index" class="card">
            <p class="text-muted card-title">{{user.userID}}</p>
            <p class="h4 card-body">{{user.score}}</p>
        </div>
    </div>
</template>

<script>
import ServerTalker from '../ServerTalker'
export default {
    name: 'Ranking',
    props: {
        userID: String,
    },
    data() {
        return {
            events: null,
            selectedEvent: 'Select the event',
            messages: {
                load: 'Please select the event',
            },
            users: null,
        }
    },
    async mounted() {
        this.events = await ServerTalker.getEvents()
    },
    methods: {
        async selectEvent(event) {
            this.selectedEvent = event.name;
            const ranking = await ServerTalker.getRanking(this.selectedEvent)
            if (ranking.status)
                this.users = ranking.users
            else {
                this.users = null
                this.messages.users = ranking.message
            }

        },
    },
}
</script>

<style>

</style>