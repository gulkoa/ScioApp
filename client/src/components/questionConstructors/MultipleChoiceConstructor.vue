<template>
  <div class="">
      <div class="card m-3 mb-4 hstack form" v-for="(option, index) in question.options" :key="index">
        <input class="form-control me-1" v-model="question.options[index]" @input="update()">
        <button class="btn btn-outline-warning mx-1" @click="move(index, 'up')">up</button>
        <button class="btn btn-outline-warning mx-1" @click="move(index, 'down')">down</button>
        <button class="btn btn-outline-danger mx-1" @click="deleteOption(index)">-</button>

        <div class="mx-3 hstack">
        <label class="m-1 form-check-label" :for="index + 'IsCorrect'" >Correct</label>
        <input type="checkbox" class="form-check-input" :id="index + 'IsCorrect'" v-model="question.secret.options[index]" @change="update()">
        </div>

      </div>
    <button class="btn btn-outline-primary" @click="addOption()">+</button>
  </div>
</template>

<script>
export default {
  name: 'MultipleChoiceConstructor',
  props: {
    question: Object,
  },
  data() {
    return {
      
    }
  },
  created() {
    this.question.options = this.question.options || [];
    
    this.question.secret.correctOptions = this.question.secret.correctOptions || [];
    this.question.secret.options = this.question.secret.options || {};
  },
  methods: {
      addOption() {
          this.question.options.push('Option ' + (this.question.options.length + 1))
          this.question.secret.options[this.question.options.length - 1] = false;
          this.update()
          this.$forceUpdate()
      },
      move(index, direction) {
        switch (direction) {
          case 'up':
            if (index > 0) {
              this.question.options.splice(index - 1, 0, this.question.options.splice(index, 1)[0])
              let buffer = this.question.secret.correctOptions[index - 1]
              this.question.secret.options[index - 1] = this.question.secret.options[index]
              this.question.secret.options[index] = buffer
            }
            break;
          case 'down':
            if (index < this.question.options.length - 1) {
              this.question.options.splice(index + 1, 0, this.question.options.splice(index, 1)[0])
              let buffer = this.question.secret.correctOptions[index + 1]
              this.question.secret.options[index + 1] = this.question.secret.options[index]
              this.question.secret.options[index] = buffer
            }
            break;
        }
        this.update()
        this.$forceUpdate()
      },

      deleteOption(index) {
        this.question.options.splice(index, 1)
        this.update()
        this.$forceUpdate()
      },

      update() {
        this.question.secret.correctOptions = Object.keys(this.question.secret.options).filter(k => this.question.secret.options[k])
        this.question.secret.correctOptions = this.question.secret.correctOptions.map(k => parseInt(k))
        // console.log(this.question.secret.correctOptions)
        if (this.question.secret.correctOptions.length > 0 && this.question.options.length > 0) {
          this.question.checklist.constructor = true
        }
        this.$emit('update')
      },
  },
}
</script>

<style>

</style>