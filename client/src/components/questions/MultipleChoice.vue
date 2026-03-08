<template>
  <div class="mb-3">
    <div class="m-3" v-for="(option, index) in question.options" :key="index">
      <!-- <div class="m-3 " @click="question.selected = index"> -->
      <input class="form-check-input" :id="'option-' + index + '-' + question._id" :name="'question-' + question._id" type="radio" :disabled="disabled" v-model="question.solution.answer" :value="index" @click="update()">
      <label class="form-check-label h5 ms-2" :for="'option-' + index + '-' + question._id">{{option}}</label>
      <!-- </div> -->
    </div>

  </div>
</template>

<script>
export default {
  name: 'Multiple-choice',
  props: {
    question: Object,
    disabled: Boolean,
  },
  async created() {
    this.question.solution = this.question.solution || {answer: undefined};
  },
  data() {
    return {
      // question: {},
    }
  },
  methods: {
    submit() {
      this.$emit('submit')
    },
    update() {
      this.$emit('update', this.question._id)
    },
  },
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
</style>
