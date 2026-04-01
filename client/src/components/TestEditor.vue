<template>
    <div>
        <!-- Test Preview Mode -->
        <div v-if="previewMode">
            <div class="m-3">
                <button class="btn btn-outline-secondary" @click="previewMode = false">Back to editor</button>
            </div>
            <p class="text-center h1">{{test.title}}</p>
            <div class="m-3" v-html="test.content"></div>
            <div v-for="(question, index) of questions" :key="'preview-'+index" class="card overflow-hidden m-3 p-4">
                <p class="text-center h4">{{question.prompt}}</p>
                <p class="text-center text-muted">{{test.questions[index].points}} points</p>
                <div v-html="question.content"></div>
                <component :is="question.type" v-bind:question="question" v-bind:disabled="false"/>
            </div>
            <div class="m-3">
                <button class="btn btn-outline-secondary" @click="previewMode = false">Back to editor</button>
            </div>
        </div>

        <!-- Editor Mode -->
        <div v-else>
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

            <!-- Questions list -->
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

            <!-- Add questions section -->
            <div class="m-3">
                <label for="addByID" class="form-label">Add question by ID</label>
                <div class="hstack">
                    <input id="addByID" v-model="questionID" alt="question ID" @keydown.enter="addQuestion()" @keydown.esc="addDefault()">
                    <button class="btn btn-outline-primary" @click="addQuestion(questionID)">+</button>
                </div>

                <div class="hstack mt-2">
                    <button class="btn btn-outline-secondary me-2" @click="displayLibrary = !displayLibrary">Add from library</button>
                    <button class="btn btn-outline-success me-2" @click="showInlineCreator = !showInlineCreator">
                        {{ showInlineCreator ? 'Hide creator' : 'Create new question' }}
                    </button>
                    <button class="btn btn-outline-info me-2" @click="previewTest()" :disabled="questions.length === 0">Preview test</button>
                </div>

                <!-- Inline Question Creator -->
                <div v-if="showInlineCreator" class="card m-2 p-3">
                    <p class="h5">Create a new question</p>

                    <div class="hstack">
                        <div class="dropdown m-2">
                            <button class="btn dropdown-toggle" data-toggle="dropdown" data-bs-toggle="dropdown">
                                {{ newQuestion.type }}
                            </button>
                            <div class="dropdown-menu">
                                <button class="btn dropdown-item" v-for="(qType, i) in questionTypes" :key="i" @click="changeNewQuestionType(qType)">{{qType}}</button>
                            </div>
                        </div>

                        <div class="dropdown m-2" v-if="topics.length > 0">
                            <button class="btn dropdown-toggle" data-toggle="dropdown" data-bs-toggle="dropdown">
                                {{ newQuestion.topic }}
                            </button>
                            <div class="dropdown-menu">
                                <button class="btn dropdown-item" v-for="(topic, i) in topics" :key="i" @click="newQuestion.topic = topic.name">{{topic.name}}</button>
                            </div>
                        </div>
                    </div>

                    <label class="form-label">Prompt</label>
                    <input class="form-control mb-2" v-model="newQuestion.prompt">

                    <label class="form-label">Question content</label>
                    <editor
                        v-model="newQuestion.content"
                        style="height: 150px;"
                        api-key="51xv4l3fxurkq1u8a7hymk96s5r0yl5695itipawx339m426"
                        :init="{
                            plugins: 'lists link image table code help wordcount autolink media preview codesample charmap hr autosave emoticons',
                        }"
                    />

                    <component v-if="newQuestionConstructor" :key="newQuestionEditorKey" :is="newQuestionConstructor" v-bind:question="newQuestion" class="border p-2 mt-2"/>

                    <!-- Preview of new question -->
                    <div class="border p-4 mt-2" v-if="newQuestionConstructor && newQuestion.prompt">
                        <p class="h5">Preview</p>
                        <p class="text-center h4">{{newQuestion.prompt}}</p>
                        <div v-html="newQuestion.content"></div>
                        <component :key="newQuestionPreviewKey" :is="newQuestion.type" v-bind:question="newQuestion" v-bind:disabled="false"/>
                    </div>

                    <div class="border p-2 mt-2 hstack">
                        <div class="mx-3">
                            <label class="form-check-label m-1" for="newShowInLibrary">Show in library</label>
                            <input class="form-check-input m-2" id="newShowInLibrary" v-model="newQuestion.showInLibrary" type="checkbox">
                        </div>
                        <div class="mx-3">
                            <label class="form-check-label m-1" for="newShowInFeed">Show in feed</label>
                            <input class="form-check-input m-2" id="newShowInFeed" v-model="newQuestion.showInFeed" type="checkbox">
                        </div>
                        <button class="btn btn-primary mx-4" @click="createAndAddQuestion()" :disabled="!canCreateQuestion">
                            Create & add to test
                        </button>
                    </div>
                    <p v-if="messages.createQuestion" class="mt-2">{{messages.createQuestion}}</p>
                </div>

                <div v-if="displayLibrary">
                    <Library :userID="userID" @selected="addQuestion" :openLink="false" :defaultEvent="selectedEvent"/>
                </div>
                <br>
                <div>
                    <button @click="saveTest()"> Add test to the database </button>
                    <p v-if="messages.saveTest" class="text-center">{{messages.saveTest}}</p>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import ServerTalker from '../ServerTalker.js'
import MultipleChoice from './questions/MultipleChoice.vue'
import Cryptography from './questions/Cryptography.vue'
import Field from './questions/Field.vue'
import MultipleChoiceConstructor from './questionConstructors/MultipleChoiceConstructor.vue'
import CryptographyConstructor from './questionConstructors/CryptographyConstructor.vue'
import FieldConstructor from './questionConstructors/FieldConstructor.vue'
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
            topics: [],
            questions: [],
            questionID: '',
            messages: {
                saveTest: '',
                createQuestion: '',
            },
            displayQuestions: true,
            displayLibrary: false,
            previewMode: false,

            // Inline question creator
            showInlineCreator: false,
            questionTypes: ['MultipleChoice', 'Cryptography', 'Field'],
            newQuestionConstructor: '',
            newQuestion: {
                prompt: '',
                content: '',
                event: '',
                type: 'Select type',
                topic: 'Select topic',
                secret: {},
                solution: {},
                showInLibrary: false,
                showInFeed: false,
                checklist: { event: true, topic: true, type: false, constructor: false },
            },
            newQuestionEditorKey: 0,
            newQuestionPreviewKey: 0,
        }
    },
    components: {
        MultipleChoice,
        Cryptography,
        Field,
        MultipleChoiceConstructor,
        CryptographyConstructor,
        FieldConstructor,
        Editor,
        Library,
    },
    computed: {
        canCreateQuestion() {
            return this.newQuestion.prompt.length > 0
                && this.newQuestion.type !== 'Select type'
                && this.newQuestionConstructor
        },
    },
    async created() {
        this.test = this.test || {}
        this.questions = this.questions || []
        this.events = await ServerTalker.getEvents()
    },
    methods: {
        freshQuestion() {
            return {
                prompt: '',
                content: '',
                event: '',
                type: 'Select type',
                topic: 'Select topic',
                secret: {},
                solution: {},
                showInLibrary: false,
                showInFeed: false,
                checklist: {
                    event: true,
                    topic: true,
                    type: false,
                    constructor: false,
                },
            }
        },
        async addQuestion(questionID) {
            try {
                if (this.questions.find(q => q._id === questionID)) {
                    this.messages.saveTest = 'This question is already in the test'
                    return
                }
                const question = await ServerTalker.loadQuestion(questionID)
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
            this.topics = event.topics || []
        },
        changeNewQuestionType(qType) {
            this.newQuestion.type = qType
            this.newQuestion.checklist.type = true
            this.newQuestion.secret = {}
            this.newQuestion.solution = {}
            this.newQuestionConstructor = qType + 'Constructor'
            this.newQuestionEditorKey++
            this.newQuestionPreviewKey++
        },
        async createAndAddQuestion() {
            if (!this.canCreateQuestion) return
            try {
                // Set event from test
                this.newQuestion.event = this.test.event !== 'Select the event' ? this.test.event : ''

                const questionToSave = { ...this.newQuestion }
                delete questionToSave.reply
                delete questionToSave.solution
                delete questionToSave.checklist

                const reply = await ServerTalker.addQuestion(questionToSave)
                if (reply.status && reply.questionID) {
                    this.messages.createQuestion = 'Question created!'
                    // Add it to the test
                    await this.addQuestion(reply.questionID)
                    // Reset the creator
                    this.newQuestion = this.freshQuestion()
                    this.newQuestionConstructor = ''
                    this.newQuestionEditorKey++
                    this.newQuestionPreviewKey++
                } else {
                    this.messages.createQuestion = reply.message || 'Failed to create question'
                }
            } catch (err) {
                this.messages.createQuestion = err.message || 'Failed to create question'
            }
        },
        previewTest() {
            this.previewMode = true
        },
        questionMounted() {},
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
            const response = await ServerTalker.addTest(this.test)
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
