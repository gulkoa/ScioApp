<template>
    <div class="form-group p-4">
        <label for="answerInput">Correct answer (only exact answers will be accepted, upper/lower case will be omitted). You can add multiple correct answers by separating them with ;</label>
        <input id="answerInput" class="form-control" type="text" v-model="question.secret.correctAnswer">
        <!-- Accepted answers: {{question.secret.correctAnswers}} -->
        <h5>
            <span v-for="(answer, index) of question.secret.correctAnswers" class="badge bg-secondary m-1" :key="index"> {{answer}}</span>
        </h5>
        <!-- <br>
        <label>Numeric</label>
        <input type="checkbox" class="m-2" v-model="numeric" @change="updateInput()">
        <br>
        <div>
            <label>Tolerance (%)</label>
            <input id="toleranceInput" type="number" class="m-2" :disabled="!numeric">
            <p v-if="numeric">{{toleranceRange[0]}} - {{toleranceRange[1]}}</p>
        </div>
        <br> -->

  </div>
</template>

<script>
export default {
    name: 'FieldConstructor',
    props: {
        question: Object,
    },
    data: function() {
        return {
            toleranceRange: [0, 100],
            toleranceInput: undefined,
            answerInput: undefined,
            toleranceKey: 0,
            numbers: '0123456789',
            numeric: false,
        }
    },
    created() {
        this.numeric = this.question.secret.numeric || false;
        this.question.secret.numeric = this.question.secret.numeric || this.numeric
        this.question.secret.correctAnswer = this.question.secret.correctAnswer || ''
        this.question.secret.correctAnswers = this.question.secret.correctAnswers || []
        this.question.secret.tolerance = this.question.secret.tolerance || 0
        this.question.secret.numericAnswer = this.question.secret.numericAnswer || 0
    },
    mounted() {
        // this.toleranceInput = document.getElementById('toleranceInput')
        this.answerInput = document.getElementById('answerInput')
        // this.toleranceInput.oninput = this.updateTolerance
        this.answerInput.oninput = this.updateInput
    },


    methods: {
        update() {
                this.$emit('update', this.question)
                this.$forceUpdate()
            },

        updateTolerance() {
            this.toleranceInput.value = this.toleranceInput.value.replace(/[^0-9.]/g, '')
            console.log(this.toleranceInput.value)
            if (this.toleranceInput.value.length > 0) {
                this.question.secret.tolerance = parseInt(this.toleranceInput.value)
            } else {
                this.question.secret.tolerance = 0
            }

            if (this.question.secret.tolerance > 100) {
                this.question.secret.tolerance = 100
                this.toleranceInput.value = 100
            }
            else if (this.question.secret.tolerance < 0) {
                this.question.secret.tolerance = 0
                this.toleranceInput.value = 0
            }

            if (this.numeric) {
                const number = this.question.secret.numericAnswer
                const error = this.question.secret.tolerance * number / 100
                // console.log(number)
                this.toleranceRange = [number-error, number+error]
            }

            this.update()
        },

        updateInput() {
            this.question.secret.correctAnswers = this.question.secret.correctAnswer.split(';')
            this.question.checklist.constructor = this.question.secret.correctAnswers.length >= 0
            this.update()
            
            // if (this.numeric) {
            //     this.answerInput.value = this.answerInput.value.replace(/[^0-9.]/g, '')
            //     if (this.answerInput.value.length > 0) {
            //         this.question.secret.numericAnswer = parseInt(this.answerInput.value)
            //     } else {
            //         this.question.secret.numericAnswer = 0
            //     }
            //     this.updateTolerance()
            //     // console.log(this.question.secret.numericAnswer)
            // }
            // else {
            //     this.question.secret.correctAnswer = this.answerInput.value
            //     this.update()
            // }
        },
    },
}
</script>

<style>

</style>