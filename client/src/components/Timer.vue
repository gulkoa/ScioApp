<template>
    <div class="fullwidth">
        <div class="hstack timer">
            <p class="text-center h3 mx-2" id="timeDisplay"> Time: 0 </p>
            <button class="btn btn-outline-primary" @click="visible = !visible">
                <svg v-if="visible" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-eye-slash" viewBox="0 0 16 16">
                <path d="M13.359 11.238C15.06 9.72 16 8 16 8s-3-5.5-8-5.5a7.028 7.028 0 0 0-2.79.588l.77.771A5.944 5.944 0 0 1 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.134 13.134 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755-.165.165-.337.328-.517.486l.708.709z"/>
                <path d="M11.297 9.176a3.5 3.5 0 0 0-4.474-4.474l.823.823a2.5 2.5 0 0 1 2.829 2.829l.822.822zm-2.943 1.299.822.822a3.5 3.5 0 0 1-4.474-4.474l.823.823a2.5 2.5 0 0 0 2.829 2.829z"/>
                <path d="M3.35 5.47c-.18.16-.353.322-.518.487A13.134 13.134 0 0 0 1.172 8l.195.288c.335.48.83 1.12 1.465 1.755C4.121 11.332 5.881 12.5 8 12.5c.716 0 1.39-.133 2.02-.36l.77.772A7.029 7.029 0 0 1 8 13.5C3 13.5 0 8 0 8s.939-1.721 2.641-3.238l.708.709zm10.296 8.884-12-12 .708-.708 12 12-.708.708z"/>
                </svg>

                <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-eye" viewBox="0 0 16 16">
                <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.134 13.134 0 0 1 1.172 8z"/>
                <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0z"/>
                </svg>
            </button>
            <button class="btn mx-2 btn-outline-warning" @click="pause()" v-bind:disabled="disabled">{{pauseButtonText}}</button>
        </div>
    </div>
</template>

<script>
export default {
    name: 'Timer',
    props: {
        question: Object,
        disabled: Boolean
    },
    data() {
        return {
            timeDisplay: undefined,
            pauseButtonText: 'Pause',
            visible: true,
        }
    },
    mounted() {
        this.question.timer = this.question.timer || undefined
        this.timeDisplay = document.getElementById('timeDisplay')
        this.question.paused = false
        this.startTimer()
    },
    methods: {
        startTimer() {
            // console.log(this.question.solution.time)
            if (this.question.solution.time && this.question.solution.time > 0) {
                this.question.startTime = new Date() - this.question.solution.time * 100
            }
            else {
                this.question.startTime = new Date()
            }

            if (this.question.solution.time > 0) {
                const ms = this.question.solution.time % 10
                const s = Math.floor(this.question.solution.time / 10 % 60)
                const m = Math.floor(this.question.solution.time / 600)
                // console.log(ms, s, m)
                this.timeDisplay.innerHTML = m > 0 ? `Time: ${m}:${s}.${ms}` :  `Time: ${s}.${ms}`
            }
            clearInterval(this.question.timer)
            if (!this.disabled) {
                this.question.timer = setInterval(() => {
                        if (this.visible) {
                            this.question.solution.time = Math.floor((new Date() - this.question.startTime) / 100)
                            const ms = this.question.solution.time % 10
                            const s = Math.floor(this.question.solution.time / 10 % 60)
                            const m = Math.floor(this.question.solution.time / 600)
                            this.timeDisplay.innerHTML = m > 0 ? `Time: ${m}:${s}.${ms}` :  `Time: ${s}.${ms}`
                        }
                        else
                            this.timeDisplay.innerHTML = 'Timer hidden'

                }, 100)
            }
        },

        pause() {
            this.question.paused = !this.question.paused
            this.pauseButtonText = this.question.paused? 'Resume' : 'Pause'
            if (this.question.paused) {
                clearInterval(this.question.timer)
                // let i = 0.5
                // let lastTime = this.question.solution.time
                // const slowDownInterval = setInterval(() => {
                //     if (i > 0) {
                //         this.question.solution.time = Math.round(this.question.solution.time + i)

                //         const ms = this.question.solution.time % 10
                //         const s = Math.floor(this.question.solution.time / 10 % 60)
                //         const m = Math.floor(this.question.solution.time / 600)
                //         this.timeDisplay.innerHTML = m > 0 ? `Time: ${m}:${s}.${ms}` :  `Time: ${s}.${ms}`
                //         i -= 0.1
                //     } else {
                //         clearInterval(slowDownInterval)
                //         this.question.solution.time = lastTime
                //     }
                // }, 100)
            }
            else {
                this.question.startTime = new Date() - this.question.solution.time * 100
                this.startTimer()
            }
            this.$emit('updated')

        },
    }
}
</script>

<style>
    .fullwidth {
        width: 100%;
    }
    .timer {
        margin: 5px auto;
        width: fit-content;
    }
</style>