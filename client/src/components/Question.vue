<template>
  <div>
    <div v-if="serverDown" class="alert alert-danger text-center m-3 mb-0" role="alert">
      Server is unreachable. Your answers may not be saved.
    </div>
    <div class="card card-body p-4 m-3" v-if="displayQuestion">
        <QuestionWrapper :userID="userID" :question="question" :messages="messages" @loadNewQuestion="goToLibrary()"/>
    </div>
  </div>
</template>

<script>

import QuestionWrapper from './QuestionWrapper.vue'
import ServerTalker from '../ServerTalker'
import healthPing from '../healthPing'
export default {
    name: 'Question',
    mixins: [healthPing],
    props: {
        userID: String,
        prop: String, //question id
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
                submittionReply: '',
            },

        }
    },
    async created() {
        this.questionID = this.prop
        try {
            this.question = await ServerTalker.loadQuestion(this.questionID)
            this.displayQuestion = true
            
      } catch(err) {
        this.messages.loadQuestion = "Error: " + err.message
      }
    },
    methods: {
        goToLibrary() {
            window.location.href = '/question/library'
        },
    },
    
}
</script>

<style>

</style>