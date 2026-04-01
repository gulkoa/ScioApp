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

            <a v-if="permissions.add" href="/test/editor" class="btn btn-primary ms-auto">Create test</a>
            <p class="fs-6 m-1">{{messages.loadQuestion}}</p>
        </div>


        <!-- test cards -->
        <button v-for="(test, index) in tests" class="card card-body text-dark btn btn-outline-light p-1 questionCard" @click.left="openTest(index, false)" @click.middle="openTest(index, true)" :key="index">
            <p class="h4 card-body">{{test.title}}</p>
            <div class="hstack mx-auto">
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
                add: false,
            }
        }
    },
    async mounted() {
        this.loading = true
        try {
            this.events = await ServerTalker.getEvents()
            this.permissions.manage = ServerTalker.hasPermission('manage:db')
            this.permissions.add = ServerTalker.hasPermission('add:db')

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
                const reply = await ServerTalker.getTests(this.selectedEvent.name)
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