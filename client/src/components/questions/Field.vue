<template>
  <input class="form-control m-3" :disabled="disabled" v-model="question.solution.answer" @keydown.enter="submit()" @keydown="update()">
</template>

<script>
export default {
  name: 'Field',
  props: {
    question: Object,
    disabled: Boolean,
  },
  mounted() {
    this.question.solution = this.question.solution || {answer: ''};
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

<style>

</style>