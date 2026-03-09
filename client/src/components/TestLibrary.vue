<template>
    <div>
      <!-- selection bar -->
        <div class="card card-body p-4 m-3 hstack gap-3">
            <!-- event dropdown -->
            <div class="dropdown">
            <button class="btn dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false" data-bs-toggle="dropdown">
                {{ selectedEvent.name }}
            </button>
            <div class="dropdown-menu">
                <button class="btn dropdown-item" v-for="(event, index) in events" :key="index" @click="changeEvent(event)">{{event.name}}</button>
            </div>
            </div>

            <p class="ms-auto fs-6 m-1">{{messages.loadQuestion}}</p>
        </div>


        <!-- test cards -->
        <button v-for="(test, index) in tests" class="card card-body text-dark btn btn-outline-light p-1 questionCard" @click.left="openTest(index, false)" @click.middle="openTest(index, true)" :key="index">
            <!-- <p class="text-muted card-title">{{question.topic}}</p> -->
            <p class="h4 card-body">{{test.title}}</p>
            <div class="hstack mx-auto">
                <!-- <div v-if="question.solved" class="badge rounded-pill bg-success m-1">
                    <p class="m-1">Last solved {{question.solvedDateMessage}}</p>
                </div> -->
                <!-- <div v-if="question.averageTime" class="badge rounded-pill bg-warning text-dark m-1"> -->
                    <!-- <p class="m-1">Average solution time: {{Math.floor(question.averageTime / 600)}}:{{question.averageTime / 10 % 60 >= 10 ? Math.floor(question.averageTime / 10) % 60 : "0" + Math.floor(question.averageTime / 10) % 60}}</p> -->
                <!-- </div> -->
            </div>
        </button>

        <!-- loading -->
        <div v-if="loading" class="lds-ripple"><div></div><div></div></div>

    </div>
</template>

<script>
import ServerTalker from '../ServerTalker'
export default {
    name: 'TestLibrary',
    props: {
        userID: String,
    },
    data() {
        return {
            events: [],
            selectedEvent: {name: 'Select the event'},
            tests: [],
            loading: false,
            messages: {
                loadQuestion: ''
            },
            permissions: {
                manage: false,
            }
        }
    },
    async mounted() {
        this.loading = true
        try {
            const token = await this.$auth.getTokenSilently()
            this.events = await ServerTalker.getEvents(token)
            this.permissions.manage = await ServerTalker.permission(this.userID, token, 'manage:db')
            
        } catch(err) {
        this.error = err.message
        }
        this.loading = false
    },
    methods: {
        async changeEvent(event) {
            this.selectedEvent = event
            this.update()
        },

        async update() {
            this.loading = true
            try {
                const token = await this.$auth.getTokenSilently()
                const reply = await ServerTalker.getTests(this.selectedEvent.name, this.userID, token)
                this.tests = reply.tests
                this.messages.loadQuestion = ''
            } catch(err) {
                this.messages.loadQuestion = err.message
            }
            this.loading = false
        },

        async openTest(index, inNewTab) {
                //go to question
            if (inNewTab) {
                window.open(`/test/${this.tests[index]._id}`)
            } else {
                window.location.href = `/test/${this.tests[index]._id}`
            }
        },
    }

}
</script>

<style>

</style>