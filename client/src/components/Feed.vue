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

    <!-- refresh question button -->
    <p class="ms-auto fs-6 m-1">{{messages.loadQuestion}}</p>
    <button class="btn btn-success ms-auto" @click="refreshQuestion()" :disabled="this.selectedTopics.length < 1">Load</button>


  </div>

  <!-- question card -->
  <div class="card card-body p-4 m-3" v-if="question" :key="questionKey">
    <QuestionWrapper :userID="userID" :question="question" :messages="messages" @loadNewQuestion="refreshQuestion()"/>
    <!-- <p class="card-title text-muted"> {{question.topic}}</p>
    <div v-if="displayQuestion">
      <Timer v-if="questionIsMounted" v-bind:question="question" v-bind:disabled="disableQuestion" v-on:updated="timerUpdate()"/>
      <p class="text-center h4 transition" id="questionPrompt"> {{question.prompt}}</p>
      <div class="transition condensable" id="condensable">
        <div v-html="question.content"></div>
        <component :is="question.type" v-bind:question="question" v-bind:disabled="disableQuestion" @hook:mounted="questionMounted()" v-on:submit="submit"/>
        <button v-if="!question.reply || question.reply.continue" class="btn btn-primary m-2" @click="submit()"> Submit </button>

        <div class="card p-3 m-1" v-if="messages.submittionReply">
          <p class="text-center h4"> {{messages.submittionReply}} </p>
          <button v-if="!question.reply.continue" class="btn btn-success m-2 ms-auto" @click="refreshQuestion()" :disabled="this.selectedTopics.length < 1">Load new question</button>
        </div>
      </div>
    </div> -->



  </div>
  <!-- loading animation -->
  <div v-if="loading" class="lds-ripple"><div></div><div></div></div>
  <!-- <div v-else>
    <p class="text-center fs-3 m-3"></p>
  </div> -->
  
  </div>
</template>

<script>
import ServerTalker from '../ServerTalker'
import QuestionWrapper from './QuestionWrapper.vue'
export default {
  name: 'Feed',
  props: {
    userID: String,
  },
  data() {
    return {
      loading: true,
      question: undefined,
      error: false,
      displayQuestion: false,
      events: null,
      selectedEvent: {
        name: 'Select the event',
        topics: []
      },
      selectedTopics: [],
      selectedTopicsTitle: 'Select the topics',
      messages: {
        loadQuestion: 'Please select the event and topics and press "Load"',
        submittionReply: ''
      },
      timer: null,
      questionIsMounted: false,
      paused: false,
      questionKey: 0,
    }
  },
  components: {
    QuestionWrapper,
  },
  async created() {
    try {
      this.events = await ServerTalker.getEvents(await this.$auth.getTokenSilently())
      for (let event of this.events)
        for (let topic of event.topics)
          topic.checked = true
    } catch(err) {
      this.error = err.message
    }
  },
  mounted() {
    this.loading = false
  },
  methods: {
    async refreshQuestion() {
      delete this.question
      this.loading = true
      try {
        this.question = await ServerTalker.loadFeed(this.selectedEvent.name, this.selectedTopics.map(topic => topic.name), this.userID, await this.$auth.getTokenSilently())
        this.messages.loadQuestion = ''
        this.messages.submittionReply = ''
        this.paused = false
        this.question.solution = {
          time: 0,
        }
        this.questionKey++


      } catch(err) {
        this.messages.loadQuestion = err.message
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
    },
    async checkTopic(topicId) {
      // console.log(this.selectedEvent.topics[topicId].checked)
      this.selectedEvent.topics[topicId].checked = !this.selectedEvent.topics[topicId].checked
      this.updateTopics()
    },
    async updateSelectedTopicsTitle() {
      if (this.selectedTopics.length === 0) {
        this.selectedTopicsTitle = 'No topics selected'
      }
      else if (this.selectedTopics.length == this.selectedEvent.topics.length) {
        this.selectedTopicsTitle = 'All topics selected'
      }
      else {
        this.selectedTopicsTitle = this.selectedTopics.length + ' topic(s) selected'
      }
    },
  }
}
</script>

<style>
/* #app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
  margin-top: 10px;
  padding: 10px;
} */

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
