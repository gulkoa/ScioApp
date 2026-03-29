<template>
  <div>
    <div class="card card-body p-4 m-3" v-if="displayQuestion">
        <QuestionWrapper :userID="userID" :question="question" :messages="messages" @loadNewQuestion="goToLibrary()"/>
    </div>
  </div>
</template>

<script>

import QuestionWrapper from './QuestionWrapper.vue'
import ServerTalker from '../ServerTalker'
export default {
    name: 'Question',
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