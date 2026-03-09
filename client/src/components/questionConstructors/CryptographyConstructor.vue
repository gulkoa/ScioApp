<template>
    <div>

        <label class="form-label">Ciphertext (will be displayed to user)</label>
        <input class="form-control m-1" @input="update($event)" v-model="question.ciphertext" id="ciphertext">
        <label class="form-label">Plaintext (will be used for grading, all punctuation and numbers will be omitted)</label>
        <div class="hstack">
            <input class="form-control m-1" @input="update($event)" v-model="question.secret.plaintext" id="plaintext">
            <button class="btn btn-success m-1" :disabled="question.secret.plaintext.length < 1" @click="encrypt()">Encrypt</button>
        </div>

        <p>{{messages.inputs}}</p>

        <label class="form-check-label">Timed question</label>
        <input class="form-check-input m-2" v-model="question.timed" type="checkbox">

        <div class="dropdown">
            <label for="frequencyTableTypeDropdown" class="form-check-label">Frequency table </label>
            <button id="frequencyTableTypeDropdown" class="btn dropdown-toggle m-1" data-toggle="dropdown" data-bs-toggle="dropdown">
                {{frequencyTableType}}
            </button>
            <div class="dropdown-menu">
                <button class="dropdown-item" @click="updateFrequencyTableType('Regular')">Regular</button>
                <button class="dropdown-item" @click="updateFrequencyTableType('None')">None</button>
                <button class="dropdown-item" @click="updateFrequencyTableType('K2')">K2</button>
            </div>
        </div>
    </div>
  
</template>

<script>
import ServerTalker from '../../ServerTalker';
export default {
    name: 'CryptographyConstructor',
    props: {
        question: Object,
    },
    data() {
        return {
            messages: {
                inputs: 'Please enter ciphertext',
            },
            frequencyTableType: 'Regular',
        }
    },
    created() {
        this.question.ciphertext = this.question.ciphertext || '';
        this.question.secret.plaintext = this.question.secret.plaintext || '';
        this.question.timed = this.question.timed || false;
        this.frequencyTableType = this.question.frequencyTableType || 'Regular';
        this.question.frequencyTableType = this.question.frequencyTableType || this.frequencyTableType;
    },

    methods: {
        update(event) {
            this.question.ciphertext = this.question.ciphertext.toUpperCase();
            this.question.secret.plaintext = this.question.secret.plaintext.toUpperCase();
            event.target.value = event.target.value.toUpperCase()

            this.$emit('update')

            if (this.question.ciphertext.length === 0) {
                this.messages.inputs = 'Please enter ciphertext'
            } else if (this.question.secret.plaintext.length === 0) {
                this.messages.inputs = 'Please enter plaintext'
            } else if (this.question.ciphertext.length !== this.question.secret.plaintext.length) {
                this.messages.inputs = 'Ciphertext and plaintext must be the same length'
            } else {
                this.messages.inputs = ''
            }

            if (this.question.ciphertext.length > 0 && this.question.secret.plaintext.length > 0 && this.question.ciphertext.length === this.question.secret.plaintext.length) {
                this.question.checklist.constructor = true
            }
            else
                this.question.checklist.constructor = false

            this.$forceUpdate()
        },

        updateFrequencyTableType(type) {
            this.frequencyTableType = type
            this.question.frequencyTableType = type
            this.$emit('update')
        },

        async encrypt() {
            try {
                let res = await ServerTalker.encrypt(this.question.secret.plaintext, this.question.topic, this.$auth.user.sub, await this.$auth.getTokenSilently())
                this.question.ciphertext = res.ciphertext
                document.getElementById('ciphertext').value = res.ciphertext
                this.question.secret.plaintext = res.plaintext
                document.getElementById('plaintext').value = res.plaintext
            }
            catch (err) {
                this.messages.inputs = err.message
            }
        }
    },
}
</script>

<style>

</style>