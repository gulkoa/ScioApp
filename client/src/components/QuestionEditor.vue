<template>
  <div class="card m-4">

    <p v-if="!permissions.add" class="h5 m-3 text-danger">Warning! You will not be able to submit the question to the database, but you can just play around</p>

    <div class="hstack">
      <div class="dropdown m-2">
        <button class="btn dropdown-toggle" data-toggle="dropdown" data-bs-toggle="dropdown">
          {{ question.event }}
        </button>
        <div class="dropdown-menu">
          <button class="btn dropdown-item" v-for="(event, index) in events" :key="index" @click="changeEvent(event)">{{event.name}}</button>
        </div>
      </div>

      <div class="dropdown m-2">
        <button class="btn dropdown-toggle" :disabled="this.topics.length < 1" data-toggle="dropdown" data-bs-toggle="dropdown">
          {{ question.topic }}
        </button>
        <div class="dropdown-menu">
          <button class="btn dropdown-item" v-for="(topic, index) in topics" :key="index" @click="changeTopic(topic)">{{topic.name}}</button>
        </div>
      </div>


      <div class="dropdown m-2">
        <button class="btn dropdown-toggle" data-toggle="dropdown" data-bs-toggle="dropdown">
          {{ question.type }}
        </button>
        <div class="dropdown-menu">
          <button class="btn dropdown-item" v-for="(questionType, index) in questionTypes" :key="index" @click="changeQuestionType(questionType)">{{questionType}}</button>
        </div>
      </div>
    </div>

  <div class="mx-4 mb-3">
  <label class="form-label">Prompt</label>
  <input id="promptInput" class="m-2 form-control" v-model="question.prompt">
  <label class="form-label">Question content</label>
    <editor
      v-model="question.content"
      style="height: 210px;"
      api-key="51xv4l3fxurkq1u8a7hymk96s5r0yl5695itipawx339m426"
      :init="{
        plugins: 'lists link image table code help wordcount autolink media preview codesample charmap hr autosave emoticons',
      }"
    />

  </div>

    <!-- content -->
    <!-- <div class="border p-2">
      <div class="dropdown m-2">
        <button class="btn dropdown-toggle" data-toggle="dropdown" data-bs-toggle="dropdown">
          Add content
        </button>
        <div class="dropdown-menu">
          <button class="btn dropdown-item" @click="add('picture')">Picture</button>
          <button class="btn dropdown-item" @click="add('rich text')">Rich text</button>
          <button class="btn dropdown-item" @click="add('embed')">Embed</button>
        </div>
      </div>
    </div> -->

    <component :key="editorKey" :is="constructor" v-bind:question="question" class="border p-2" v-on:update="updatePreview()"></component>

    <!-- preview -->
    <div class="border p-4" v-if="showPreview">
      <p class="h4">Preview</p>
      <p class="text-center h4">{{question.prompt}}</p>
      <div v-html="question.content"></div>
      <component :key="previewKey" :is="question.type" v-bind:question="question" v-bind:disabled="false" v-on:submit="submitMockSolution()" />
      <button @click="submitMockSolution()" class="btn btn-primary" >Submit</button>
      <p v-if="messages.submittionReply" class="text-center h4">{{messages.submittionReply}}</p>
    </div>

    <!-- adding to database -->

    <div class="border p-2 hstack">
      <div class="mx-3">
        <label class="form-check-label m-1" for="showInLibrary">Show in the library</label>
        <input class="form-check-input m-2" id="showInLibrary" v-model="question.showInLibrary" type="checkbox">
      </div>

      <div class="mx-3">
        <label class="form-check-label m-1" for="showInFeed">Show in the feed</label>
        <input class="form-check-input m-2" id="showInFeed" v-model="question.showInFeed" type="checkbox">
      </div>

      <div class="mx-3">
        <label class="form-check-label m-1" for="clearAfterAdding">Clear editor after adding</label>
        <input class="form-check-input m-2" id="clearAfterAdding" v-model="clearAfterAdding" type="checkbox">
      </div>

      <button class="btn btn-primary mx-4" v-if="permissions.add" @click="addQuestion()">Add question to the database</button>
      <p v-if="messages.addQuestion">{{messages.addQuestion}}</p>
    </div>

    <iframe ></iframe>
  </div>
</template>

<script>
import ServerTalker from '../ServerTalker'

import MultipleChoiceConstructor from './questionConstructors/MultipleChoiceConstructor.vue'
import CryptographyConstructor from './questionConstructors/CryptographyConstructor.vue'
import FieldConstructor from './questionConstructors/FieldConstructor.vue'

import MultipleChoice from './questions/MultipleChoice.vue'
import Cryptography from './questions/Cryptography.vue'
import Field from './questions/Field.vue'


import Editor from '@tinymce/tinymce-vue'

export default {
  name: 'QuestionEditor',
  props: {
    userID: String,
  },
  components: {
    MultipleChoiceConstructor,
    CryptographyConstructor,
    FieldConstructor,
    MultipleChoice,
    Cryptography,
    Field,
    Editor
  },
  async created() {
    try {
      this.events = await ServerTalker.getEvents()
      this.permissions.add = ServerTalker.hasPermission('add:db')
      this.permissions.propose = ServerTalker.hasPermission('propose:db')
    } catch(err) {
      this.error = err.message
    }
    

  },
  data() {
    return {
      events: [],

      topics: [],


      questionTypes: ['MultipleChoice', 'Cryptography', 'Field'],

      constructor: '',

      question: {
        
        prompt: '',
        content: '',
        event: 'Please select the event',
        type: 'Please select the question type',
        topic: 'Please select the topic', 
        secret: {},
        solution: {},
        showInLibrary: true,
        showInFeed: true,

        checklist: {
          event: false,
          topic: false,
          type: false,
          constructor: false,
        },
      },

      showPreview: false,

      previewKey: 0,
      editorKey: 0,

      messages: {
        submittionReply: '',
        addQuestion: '',
      },

      permissions: {
        add: false,
        propose: false,
      },

      clearAfterAdding: true,
    }
  },
  methods: {
    changeEvent(event) {
      this.question.event = event.name
      this.topics = event.topics
      this.question.checklist.event = true
    },
    changeTopic(topic) {
      this.question.topic = topic.name
      this.question.checklist.topic = true
    },
    changeQuestionType(questionType) {
      this.constructor = questionType + "Constructor"
      this.showPreview = true

      this.question = {
            prompt: this.question.prompt,
            event: this.question.event,
            type: questionType,
            topic: this.question.topic,
            content: this.question.content,
            secret: {},
            solution: {},
            showInLibrary: this.question.showInLibrary,
            showInFeed: this.question.showInFeed,
        
            checklist: {
              event: this.question.checklist.event,
              constructor: false,
              topic: this.question.checklist.topic,
              type: true,
            }
      },

      this.previewKey++
      this.editorKey++
    },

    add(contentType) {
      switch(contentType) {
        case 'picture':
          this.question.content.push({
            type: 'picture',
            url: '',
          })
          break
      }
    },

    updatePreview() {
      this.previewKey++
      this.constructorKey++
    },

    async submitMockSolution() {
      try {
        this.question['reply'] = await ServerTalker.mockSubmitSolution(this.question)
        this.messages.submittionReply = this.question.reply.message
      } catch(err) {
        this.error = err.message
        this.messages.submittionReply = err.message
      }
    },

    async addQuestion() {
      if (!this.permissions.add) {
        this.messages.addQuestion = "You are not allowed to add questions"
        return
      }
      if (this.question.checklist.event && this.question.checklist.topic && this.question.checklist.type && this.question.checklist.constructor && this.question.prompt.length > 0) {
        delete this.question.reply
        delete this.question.solution
        const reply = await ServerTalker.addQuestion(this.question)
        this.messages.addQuestion = reply.message
        if (reply.status && this.clearAfterAdding) {
          this.question = {
            prompt: '',
            event: this.question.event,
            type: this.question.type,
            topic: this.question.topic,
            content: '',
            secret: {},
            solution: {},
            showInLibrary: this.question.showInLibrary,
            showInFeed: this.question.showInFeed,
        
            checklist: {
              event: this.question.checklist.event,
              constructor: false,
              topic: this.question.checklist.topic,
              type: this.question.checklist.type,
            }
          }
          this.topics = []
          this.showPreview = false
        }
        this.constructorKey++
      }
      else {
        this.messages.addQuestion = "Please fill out all required fields!"
        if (!this.question.checklist.event) {
          this.messages.addQuestion += " Event is not selected"
        }
        if (!this.question.checklist.topic) {
          this.messages.addQuestion += " Topic is not selected"
        }
        if (!this.question.checklist.type) {
          this.messages.addQuestion += " Type is not selected"
        }
        if (!this.question.checklist.constructor) {
          this.messages.addQuestion += " Question is not constructed"
        }
        if (this.question.prompt.length < 1) {
          this.messages.addQuestion += " Prompt is empty"
        }
      }
    },
  },
  computed: {
    // allowedToSubmit() {
    //   return this.userID == 'auth0|6251e28defc16b0068476678' || this.userID == 'google-oauth2|100362485441558761721'
    // }
  }
}
</script>
    
<style>

</style>