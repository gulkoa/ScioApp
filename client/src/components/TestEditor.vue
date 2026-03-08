<template>
    <div>
        <div class="m-3">
            <!-- event dropdown -->
            <div class="dropdown">
                <button class="btn dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false" data-bs-toggle="dropdown">
                    {{ test.event }}
                </button>
                <div class="dropdown-menu">
                    <button class="btn dropdown-item" v-for="(event, index) in events" :key="index" @click="changeEvent(event)">{{event.name}}</button>
                </div>
            </div>

            <label class="m-1 form-control-label" for="testTitle">Test title</label>
            <input class="form-control" v-model="test.title" id="testTitle">
            
            <label class="form-label">Test introduction</label>
            <editor
            v-model="test.content"
            style="height: 210px;"
            api-key="51xv4l3fxurkq1u8a7hymk96s5r0yl5695itipawx339m426"
            :init="{
                plugins: 'lists link image table code help wordcount autolink media preview codesample charmap hr autosave emoticons',
            }"
            />
        </div>
        <hr/>
        <div class="card m-3 mb-4" v-for="(question, index) in questions" :key="index">

            <div class="hstack p-2 m-auto">
                <button class="btn btn-outline-warning mx-1" @click="move(index, 'up')">up</button>
                <button class="btn btn-outline-warning mx-1" @click="move(index, 'down')">down</button>
                <button class="btn btn-outline-danger mx-1" @click="deleteQuestion(index)">-</button>
                <div class="mx-1 hstack">
                    <label class="m-1 form-check-label" :for="index + 'IsTimed'">Timed</label>
                    <input type="checkbox" class="form-check-input" :id="index + 'IsTimed'" v-model="test.questions[index].timed">
                </div>

                <div class="mx-1 hstack">
                    <label class="m-1 form-control-label" :for="index + 'points'">Points</label>
                    <input type="number" class="form-control" :id="index + 'points'" v-model="test.questions[index].points">
                </div>
            </div>
            
            <div class="border rounded p-4" v-if="displayQuestions">
                <p class="text-center h4"> {{question.prompt}}</p>
                <div v-html="question.content"></div>
                <component :is="question.type" v-bind:question="question" @hook:mounted="questionMounted()"/>
            </div>

        </div>

        <div>
            <label for="addByID" class="form-label">Add question by ID</label>
            <div class="hstack">
                <input id="addByID" v-model="questionID" alt="question ID" @keydown.enter="addQuestion()" @keydown.esc="addDefault()">
                <button class="btn btn-outline-primary" @click="addQuestion(questionID)">+</button>
            </div>

            <button @click="displayLibrary = !displayLibrary"> Add from library </button>


            <div v-if="displayLibrary">
                <Library :userID="userID" @selected="addQuestion" :openLink="false" :defaultEvent="selectedEvent"/>
            </div>
            <br>
            <div>
                <button @click="saveTest()" class=""> Add test to the database </button>
                <p v-if="messages.saveTest" class="text-center">{{messages.saveTest}}</p>
            </div>
        </div>
    </div>
</template>

<script>
import ServerTalker from '../ServerTalker.js'
import MultipleChoice from './questions/MultipleChoice.vue'
import Cryptography from './questions/Cryptography.vue'
import Editor from '@tinymce/tinymce-vue'
import Library from './Library.vue'
export default {
    name: 'TestEditor',
    props: {
        userID: String,
    },
    data() {
        return {
            test: {
                title: '',
                content: '',
                questions: [],
                event: 'Select the event',
            },
            events: [],
            selectedEvent: null,
            questions: [],
            questionID: '',
            messages: {
                saveTest: ''
            },
            displayQuestions: true,
            displayLibrary: false,
        }
    },
    components: {
        MultipleChoice,
        Cryptography,
        Editor,
        Library,
    },
    async created() {
        this.test = this.test || {}
        this.questions = this.questions || []
        this.events = await ServerTalker.getEvents(await this.$auth.getTokenSilently())
    },
    methods: {
        async addQuestion(questionID) {
            try {
                if (this.questions.find(q => q._id == questionID)) {
                    this.messages.saveTest = 'This question is already in the test'
                    return
                }
                const question = await ServerTalker.loadQuestion(questionID, this.userID, await this.$auth.getTokenSilently())
                this.questions.push(question)
                this.test.questions.push({questionID: questionID, timed: question.timed, points: 0})
                this.questionID = ''
            }
            catch (err) {
                this.messages.saveTest = err.message
            }
            
        },
        changeEvent(event) {
            this.test.event = event.name
            this.selectedEvent = event
        },
        questionMounted() {

        },
        deleteQuestion(index) {
            this.test.questions.splice(index, 1)
            this.questions.splice(index, 1)
            this.$forceUpdate()
        },
        addDefault() {
            this.questionID = '6253035c8dbc87a8cbf00107'
            this.addQuestion()

            this.questionID = '62461f9a158335bd152e82e2'
            this.addQuestion()
        },
        move(index, direction) {
            switch (direction) {
            case 'up':
                if (index > 0) {
                    let buffer = this.test.questions[index]
                    this.test.questions[index] = this.test.questions[index - 1]
                    this.test.questions[index - 1] = buffer

                    buffer = this.questions[index]
                    this.questions[index] = this.questions[index - 1]
                    this.questions[index - 1] = buffer

                    this.displayQuestions = false
                    setTimeout(() => {
                        this.displayQuestions = true
                        this.$forceUpdate()
                    }, 5)
                }
                break;
            case 'down':
                if (index < this.questions.length - 1) {
                    let buffer = this.test.questions[index]
                    this.test.questions[index] = this.test.questions[index + 1]
                    this.test.questions[index + 1] = buffer

                    buffer = this.questions[index]
                    this.questions[index] = this.questions[index + 1]
                    this.questions[index + 1] = buffer
                    
                    this.displayQuestions = false
                    setTimeout(() => {
                        this.displayQuestions = true
                        this.$forceUpdate()
                    }, 5)
                }
                break;
            }
        },
        update() {
            this.$forceUpdate()
        },
        async saveTest() {
            const response = await ServerTalker.addTest(this.test, this.userID, await this.$auth.getTokenSilently())
            //parse scores
            this.test.questions.forEach(q => {
                q.points = parseInt(q.points)
            })
            this.messages.saveTest = response.message
        },
    }
}
</script>

<style>

</style>