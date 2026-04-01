import axios from 'axios'

const url = window.location.protocol + '//' + window.location.host + '/api/health'

/**
 * Vue mixin that pings /api/health every 60s while the component is mounted.
 * Sets this.serverDown = true when the backend is unreachable.
 */
export default {
    data() {
        return {
            serverDown: false
        }
    },
    mounted() {
        this._healthTimer = setInterval(() => this._checkHealth(), 60 * 1000)
    },
    beforeDestroy() {
        if (this._healthTimer) clearInterval(this._healthTimer)
    },
    methods: {
        async _checkHealth() {
            try {
                await axios.get(url, { timeout: 5000 })
                this.serverDown = false
            } catch {
                this.serverDown = true
            }
        }
    }
}
