<template>
    <div>
        <p class="h5 m-3">{{messages.loadTest}}</p>
        <Timer v-if="questionIsMounted" :key="questionsKey" :disabled="displayReply" v-bind:question="test" v-on:updated="timerUpdate()" class="sticky-top bg-white"/>
        <p class="text-center h1"> {{test.title}}</p>
        <div class="m-3" v-html="test.content"></div>
        <div v-for="(question, index) of test.questions" :key="index" class="card overflow-hidden m-3 p-4">
            <p class="text-center h4 transition blurrable"> {{question.question.prompt}}</p>
            <div class="transition condensable">
                <p class="text-center text-muted">{{question.points}} points</p>
                <div v-html="question.question.content"></div>
                <component :key="questionsKey" :is="question.question.type" v-bind:question="question.question" v-bind:disabled="disableQuestions" @hook:mounted="questionMounted()" v-on:submit="submit" @update="questionUpdate"/>
                <div v-if="displayCorrectAnswers">
                    <p class="text-center h3">{{test.reply.reports[index].message}}</p>
                    <p v-if="!test.reply.reports[index].correct" class="text-center h5">Correct answer: {{test.reply.reports[index].correctAnswer}}</p>
                </div>

            </div>
        </div>

        <div v-if="loading" class="lds-ripple"><div></div><div></div></div>

        <div class="form-group p-2 m-3">
            <button v-if="!test.reply" class="btn btn-primary" @click="submit()"> Submit </button>
            <p>Questions answered: {{questionsAnswered.length}}/{{test.questions.length}}</p>

            <p class="text-center h4"> {{messages.submittionReply}} </p>

            <div class="m-3" v-if="displayReply && !displayCorrectAnswers">
                <p class="h2 text-center">Your score: {{test.reply.score}}</p>
                <div class="m-auto p-2" v-if="!displayCorrectAnswers">
                    <button class="btn btn-warning m-2" @click="tryAgain()">Try again</button>
                    <button class="btn btn-success m-2" @click="displayCorrectAnswers = true">See correct answers</button>
                </div>
            </div>
        </div>

    </div>
</template>

<script>
import MultipleChoice from './questions/MultipleChoice.vue'
import Cryptography from './questions/Cryptography.vue'
import ServerTalker from '../ServerTalker'
import Timer from './Timer'
export default {
    props: {
        userID: String,
        prop: String,
    },
    components: {
        MultipleChoice,
        Cryptography,
        Timer
    },
    data() {
        return {
            loading: true,
            test: {
                solution: {
                    time: 0
                }
            },
            paused: false,
            questionIsMounted: false,
            messages: {
                submissionReply: '',
                loadTest: '',
            },
            disableQuestions: false,
            displayCorrectAnswers: false,
            displayReply: false,
            questionsKey: 0,
            questionsAnswered: [],
        }
    },
    async mounted() {
        //get test
        try {
            const response = await ServerTalker.loadTest(this.prop, this.userID, await this.$auth.getTokenSilently())
            this.test = response.test
            this.test.solution = {
                time: 0,
                solutions: []
            }   
            this.messages.loadTest = ''
        }
        catch (err) {
            this.messages.loadTest = err.message
        }
        this.loading = false
    },
    methods: {
        async submit() {
            this.test.solution.solutions = []
            this.test.questions.forEach(q => {
                this.test.solution.solutions.push(q.question.solution)
            })
            try {
                const reply = await ServerTalker.submitTest(this.test._id, this.test.solution.solutions, this.userID, await this.$auth.getTokenSilently())
                this.test.reply = reply
                this.displayReply = true
                this.disableQuestions = true
                this.questionsKey++

            }
            catch (err) {
                this.messages.submissionReply = err
            }
        },
        timerUpdate() {
            this.paused = this.test.paused
            const condensables = [...document.getElementsByClassName('condensable')]
            const blurrables = [...document.getElementsByClassName('blurrable')]
            //make blur
            if (this.paused) {
                blurrables.forEach(blurrable => {
                    blurrable.classList.add('blur')
                })
                condensables.forEach(condensable => {
                    condensable.classList.add('condensed')
                })
                
            } else {
                blurrables.forEach(blurrable => {
                    blurrable.classList.remove('blur')
                })
                condensables.forEach(condensable => {
                    condensable.classList.remove('condensed')
                })
            }
        },
        questionMounted() {
            this.questionIsMounted = true
            const condensables = [...document.getElementsByClassName('condensable')]
            condensables.forEach(condensable => {
                condensable.style.setProperty('--question-height', (condensable.offsetHeight + 500) + 'px')
            })
        },

        questionUpdate(questionID) {
            if (!this.questionsAnswered.includes(questionID)) {
                this.questionsAnswered.push(questionID)
            }
        },

        tryAgain() {
            delete this.test.reply
            this.displayReply = false
            this.displayCorrectAnswers = false
            this.disableQuestions = false
            this.questionsKey++
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

    .transition.blurrable.blur {
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