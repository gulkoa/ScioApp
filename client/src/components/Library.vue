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

            <!-- topic dropdown -->
            <div class="dropdown"> 
            <button class="btn dropdown-toggle" data-toggle="dropdown" data-bs-toggle="dropdown" :disabled="this.selectedEvent.topics.length < 1">
                {{ selectedTopicsTitle }}
            </button>
            <div class="dropdown-menu">
                <button class="dropdown-item" @click="selectAllTopics()">Select all</button>
                <li class="dropdown-item m-0.5" v-for="(topic, index) in selectedEvent.topics" :key="index" @change="updateTopics()" @click="checkTopic(index)">
                <input type="checkbox" class="form-check-input m-1" v-model="topic.checked">
                <label class="form-check-label">{{topic.name}}</label>
                </li>
            </div>
            </div>

            <!-- show hidden toggle (manage:db or admin/captain) -->
            <div v-if="canManage" class="form-check form-switch ms-auto me-3">
                <input class="form-check-input" type="checkbox" id="showHidden" v-model="showHidden" @change="refreshQuestions()">
                <label class="form-check-label" for="showHidden">Show hidden</label>
            </div>

            <p class="fs-6 m-1" :class="{ 'ms-auto': !canManage }">{{messages.loadQuestion}}</p>
        </div>
        


        <!-- question cards -->
        <button v-for="(question, index) in questions" class="card card-body text-dark btn btn-outline-light p-1 questionCard position-relative" @click.left="openQuestion(index, false)" @click.middle="openQuestion(index, true)" :key="index">
            <p class="text-muted card-title">{{question.topic}}</p>
            <p class="h4 card-body">{{question.prompt}}</p>
            <div class="hstack mx-auto">
                <div v-if="question.solved" class="badge rounded-pill bg-success m-1">
                    <p class="m-1">Last solved {{question.solvedDateMessage}}</p>
                </div>
                <div v-if="question.averageTime" class="badge rounded-pill bg-warning text-dark m-1">
                    <p class="m-1">Average solution time: {{Math.floor(question.averageTime / 600)}}:{{question.averageTime / 10 % 60 >= 10 ? Math.floor(question.averageTime / 10) % 60 : "0" + Math.floor(question.averageTime / 10) % 60}}</p>
                </div>
                <div v-if="showHidden && !question.showInLibrary" class="badge rounded-pill bg-secondary m-1">
                    <p class="m-1">Hidden from library</p>
                </div>
                <div v-if="showHidden && !question.showInFeed" class="badge rounded-pill bg-secondary m-1">
                    <p class="m-1">Hidden from feed</p>
                </div>
            </div>
            <a v-if="canManage" class="btn btn-sm btn-outline-secondary position-absolute top-0 end-0 m-2"
               :href="'/question/editor?id=' + question._id" @click.stop>Edit</a>
        </button>

        <!-- loading -->
        <div v-if="loading" class="lds-ripple"><div></div><div></div></div>

   </div>
</template>

<script>
import ServerTalker from '../ServerTalker'
export default {
    name: 'Library',
    props: {
        userID: String,
        openLink: {
            type: Boolean,
            default: true,
        },
        defaultEvent: {
            type: Object,
            default: null,
        }
    },
    data() {
        return {
            loading: true,
            events: null,
            selectedEvent: {
                name: 'Select the event',
                topics: []
            },
            selectedTopics: [],
            selectedTopicsTitle: 'Select the topics',
            messages: {
                loadQuestion: 'Please select the event and topics',
            },
            questions: [],
            showHidden: false
        }
    },
    computed: {
        canManage() {
            const user = this.$auth.user
            if (!user) return false
            if (['admin', 'captain'].includes(user.role)) return true
            return (user.permissions || []).includes('manage:db')
        }
    },
    async mounted() {

        this.loading = true
        try {
            this.events = await ServerTalker.getEvents()
            for (let event of this.events)
                for (let topic of event.topics)
                topic.checked = true
            if (this.defaultEvent) {
                this.selectedEvent = this.defaultEvent
                this.selectedTopics = this.defaultEvent.topics
                this.refreshQuestions()
            }
        } catch(err) {
            this.error = err.message
        }
        this.loading = false
    },
    methods: {
        async openQuestion(index, inNewTab) {
            if (this.openLink) {
                //go to question
                if (inNewTab) {
                    window.open(`/question/${this.questions[index]._id}`)
                } else {
                    window.location.href = `/question/${this.questions[index]._id}`
                }
            }
            else
                this.$emit('selected', this.questions[index]._id)
        },
        async refreshQuestions() {
            this.loading = true
            this.questions = []
            try {
                this.questions = await ServerTalker.loadLibrary(this.selectedEvent.name, this.selectedTopics.map(topic => topic.name) || [], this.showHidden)
                this.messages.loadQuestion = ''
                this.$forceUpdate()
            } catch(err) {
                this.messages.loadQuestion = err.message
                this.questions = []
            }
            this.loading = false
            
        },
        async changeEvent(event) {
            this.selectedEvent = event
            this.selectedTopics = this.selectedEvent.topics
            this.updateTopics()
        },
        async selectAllTopics() {
            for (let i = 0; i < this.selectedEvent.topics.length; i++)
                this.selectedEvent.topics[i].checked = true
            this.updateTopics()
        },
        async updateTopics() {
            this.selectedTopics = this.selectedEvent.topics.filter(t => t.checked)
            this.updateSelectedTopicsTitle() 
            this.refreshQuestions()
        },
        async checkTopic(topicId) {
            console.log(this.selectedEvent.topics[topicId].checked)
            this.selectedEvent.topics[topicId].checked = !this.selectedEvent.topics[topicId].checked
            this.updateTopics()
        },
        async updateSelectedTopicsTitle() {
            if (this.selectedTopics.length === 0) {
                this.selectedTopicsTitle = 'No topics selected'
            }
            else if (this.selectedTopics.length === this.selectedEvent.topics.length) {
                this.selectedTopicsTitle = 'All topics selected'
            }
            else {
                this.selectedTopicsTitle = this.selectedTopics.length + ' topic(s) selected'
            }
        }
    },
}
</script>

<style>
    .questionCard {
        width: 98%;
        margin: 1%;
    }
</style>