<template>
  <div>
    <div class="m-3 hstack">
        <img src="../assets/magicIcon.svg" class="img-fluid mx-2" alt="MADTON">
        <span class="">
            <p class="h2 m-0">MADTON</p>
            <p class="m-0">Mason Automatic Destroying Tool On Nationals</p>
        </span>
        <p class="h4 mx-5">∞ questions left</p>
        <div class="dropdown m-2">
            <button class="btn dropdown-toggle" data-toggle="dropdown" data-bs-toggle="dropdown">
                {{selectedTopic}}
            </button>
            <div class="dropdown-menu">
                <button v-for="(topic, index) of topics" :key="index" class="btn dropdown-item" @click="setTopic(topic)">{{topic}}</button>
            </div>
        </div>

        <button @click="loadNewQuestion()" class="btn btn-success m-2">Load new question</button>
        {{messages.loadQuestion}}

        <p class="m-2">Solved just now: {{solvedJustNow}}</p>
    </div>
    <div class="card card-body p-4 " v-if="displayQuestion">
        <QuestionWrapper :key="questionWrapperKey" :userID="userID" :question="question" :messages="messages" @loadNewQuestion="loadNewQuestion()" @correct="correct()" :mockSubmit="true"/>
    </div>
  </div>
</template>

<script>

import QuestionWrapper from './QuestionWrapper.vue'
import ServerTalker from '../ServerTalker'
export default {
    name: 'MADTON',
    props: {
        userID: String,
    },
    components: {
        QuestionWrapper
    },
    data() {
        return {
            questionID: '',
            question: undefined,
            displayQuestion: false,
            messages: {
                loadQuestion: '',
                submittionReply: '',
            },
            selectedTopic: 'aristocrat',
            topics: ['aristocrat', 'patristocrat', 'xenocrypt', 'vigenere', 'hill', 'morbit', 'pollux', 'railfence'],
            questionWrapperKey: 0,
            solvedJustNow: 0,

        }
    },
    async created() {
        this.questionID = this.prop
        try {
            const response = await ServerTalker.MADTON(this.selectedTopic)
            this.question = response.question
            this.question.buttons = true
            this.displayQuestion = true
            
        } catch(err) {
            this.messages.loadQuestion = "Error: " + err.message
        }
    },
    methods: {

        async setTopic(topic) {
            this.selectedTopic = topic
            await this.loadNewQuestion()
        },

        async loadNewQuestion() {
            try {
                this.displayQuestion = false
                const response = await ServerTalker.MADTON(this.selectedTopic)
                this.question = response.question
                this.messages.submittionReply = ''
                this.question.buttons = true
                this.displayQuestion = true
            } catch(err) {
                this.messages.loadQuestion = "Error: " + err.message
            }
        },

        correct() {
            this.solvedJustNow++
        }

    },
    
}
</script>

<style>

</style>