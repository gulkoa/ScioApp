<template>
  <div>
      <p class="card-title text-muted"> {{question.topic}}</p>
        <div :key="questionKey">
            <Timer v-if="questionIsMounted" v-bind:question="question" v-bind:disabled="disableQuestion" v-on:updated="timerUpdate()"/>
            <p class="text-center h4 transition" id="questionPrompt"> {{question.prompt}}</p>
            <div class="transition condensable" id="condensable">
                    <div v-html="question.content"></div>
                    <component :is="question.type" v-bind:question="question" v-bind:disabled="disableQuestion" @hook:mounted="questionMounted()" v-on:submit="submit"/>

                    <button v-if="!question.reply || question.reply.continue" class="btn btn-primary m-2" @click="submit()"> Submit </button>

                    <div class="card p-3 m-1" v-if="messages.submittionReply">
                        <p class="text-center h4"> {{messages.submittionReply}} </p>
                        <div v-if="(question.reply && !question.reply.continue) || (question.buttons)" class="m-auto">
                            <div v-if="question.reply.correct">
                                <button class="btn btn-success" @click="loadNewQuestion()">Load new question</button>
                            </div>
                            <div class="m-auto p-2" v-if="!question.reply.correct && !displayCorrectAnswer">
                                <button class="btn btn-warning m-2" @click="tryAgain()">Try again</button>
                                <button class="btn btn-success m-2" @click="seeCorrectAnswer()">See correct answer</button>
                                <button class="btn btn-success" @click="loadNewQuestion()">Load new question</button>
                            </div>
                            <div v-if="displayCorrectAnswer" class="m-3 m-auto">
                                <p class="h5">Correct answer: {{question.reply.correctAnswer}}</p>
                            </div>
                        </div>
                    </div>
            </div>

        </div>
  </div>
</template>

<script>
import MultipleChoice from './questions/MultipleChoice.vue'
import Cryptography from './questions/Cryptography.vue'
import Field from './questions/Field.vue'
import ServerTalker from '../ServerTalker'
import Timer from './Timer.vue'
export default {
    name: 'QuestionWrapper',
    props: {
        userID: String,
        question: Object,
        messages: Object,
        mockSubmit: Boolean,
    },
    components: {
        MultipleChoice,
        Cryptography,
        Field,
        Timer
    },
    data() {
        return {
            disableQuestion: false,
            questionIsMounted: false,
            paused: false,
            questionKey: 0,
            displayCorrectAnswer: false,
        }
    },
    created() {
        this.question.solution = {
                time: 0,
            }
        
    },
    methods: {
        async submit() {
            try {
                if (!this.mockSubmit)
                    this.question.reply = await ServerTalker.submitSolution(this.question.solution, this.question._id)
                else
                    this.question.reply = await ServerTalker.mockSubmitSolution(this.question)

                if (!this.question.reply.continue) {
                    this.disableQuestion = true
                }
                this.questionKey++
                this.messages.submittionReply = this.question.reply.message
                if (this.question.reply.correct) {
                    this.$emit('correct')
                }
            } catch(err) {
                this.messages.submittionReply = err.message
            }
        },

        questionMounted() {
            this.questionIsMounted = true
            const condensable = document.getElementById('condensable')
            condensable.style.setProperty('--question-height', (condensable.offsetHeight + 500) + 'px')
        },

        timerUpdate() {
            this.paused = this.question.paused
            const questionPrompt = document.getElementById('questionPrompt')
            const condensable = document.getElementById('condensable')
            //make blur
            if (this.question.paused) {
                questionPrompt.classList.add('blur')
                condensable.classList.add('condensed')
                
            } else {
                questionPrompt.classList.remove('blur')
                condensable.classList.remove('condensed')
            }
        },

        seeCorrectAnswer() {
            this.displayCorrectAnswer = true
        },

        tryAgain() {
            this.messages.submittionReply = ''
            this.disableQuestion = false
            delete this.question.reply
            this.displayCorrectAnswer = false
            this.questionKey++
        },

        loadNewQuestion() {
            this.$emit('loadNewQuestion')
        }
    }
}
</script>

<style>
    .transition {
        transition: all 300ms ease-in-out;
    }
    .condensable {
        --question-height: fit-content;
        overflow: hidden;
        max-height: var(--question-height);
    }
    .condensable.condensed {
        max-height: 0;
    }

    .transition.blur {
        color: transparent;
        text-shadow: 0 0 16px #000;
        -webkit-touch-callout: none;
        -webkit-user-select: none;
        -khtml-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
    }
</style>