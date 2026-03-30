import axios from 'axios'
import { getInstance } from './auth'

const url = window.location.protocol + '//' + window.location.host + '/api/'

/**
 * Static API client. Reads JWT from auth store automatically.
 * All methods return promises.
 */
class ServerTalker {

    // Get auth headers from current session
    static _headers() {
        const auth = getInstance()
        return auth && auth.token
            ? { Authorization: 'Bearer ' + auth.token }
            : {}
    }

    // Get current user ID
    static _userID() {
        const auth = getInstance()
        return auth && auth.user ? auth.user.id : null
    }

    // Generic POST helper
    static async post(endpoint, args = {}) {
        const res = await axios.post(url + endpoint, {
            ...args,
            userID: this._userID()
        }, {
            headers: this._headers()
        })
        if (res.data.status) return res.data
        throw res.data
    }

    // Generic GET helper
    static async get(endpoint) {
        const res = await axios.get(url + endpoint, {
            headers: this._headers()
        })
        return res.data
    }

    // --- Questions ---

    static async loadFeed(event, topicsNames) {
        const data = await this.post('question/loadFeed', { event, topicsNames })
        return data.question
    }

    static async loadQuestion(questionID) {
        // Easter egg questions
        if (questionID === 'aurora1445') {
            return {"_id":{"$oid":"61a05902d63cbf8eddaf3ed7"},"prompt":"evaluate (A and B) or (A xor B) if A = 1 and B = 0","type":"MultipleChoice","options":["1","0","neither"],"secret":{"correctOptions":[{"$numberInt":"0"}]},"topic":"binary algebra","event":"Cybersecurity","showInFeed":true,"showInLibrary":true}
        }

        const data = await this.post('question/loadQuestion', { questionID })
        return data.question
    }

    static async loadLibrary(event, topicsNames) {
        const data = await this.post('question/loadLibrary', { event, topicsNames })
        return data.questions
    }

    static async submitSolution(solution, questionID) {
        return this.post('question/submitSolution', { solution, questionID })
    }

    static async mockSubmitSolution(question) {
        return this.post('question/mockSubmitSolution', { ...question })
    }

    static async addQuestion(question) {
        return this.post('question/addQuestion', { question })
    }

    // --- Permissions ---

    static hasPermission(permission) {
        const auth = getInstance()
        return auth ? auth.hasPermission(permission) : false
    }

    // --- Events ---

    static async getEvents() {
        const data = await this.get('question/getEvents')
        return data.events
    }

    // --- Rankings ---

    static async getRanking(event) {
        return this.post('question/getRanking', { event })
    }

    // --- Performance ---

    static async getPerformance() {
        return this.post('question/getPerformance')
    }

    // --- Tests ---

    static async loadTest(testID) {
        return this.post('question/loadTest', { testID })
    }

    static async submitTest(testID, testSolutions) {
        return this.post('question/submitTest', { testID, testSolutions })
    }

    static async addTest(test) {
        return this.post('question/addTest', { test })
    }

    static async getTests(event) {
        return this.post('question/loadTests', { event })
    }

    // --- MADTON ---

    static async MADTON(topic) {
        return this.post('question/MADTON', { topic })
    }

    static async encrypt(plaintext, topic) {
        return this.post('question/encrypt', { plaintext, topic })
    }

    // --- Admin ---

    static async getUsers() {
        return this.get('auth/admin/users')
    }

    static async updateUserRole(userId, role) {
        const res = await axios.patch(url + 'auth/admin/users/' + userId + '/role', { role }, {
            headers: this._headers()
        })
        return res.data
    }

    static async updateUserPermissions(userId, permissions) {
        const res = await axios.patch(url + 'auth/admin/users/' + userId + '/permissions', { permissions }, {
            headers: this._headers()
        })
        return res.data
    }

    static async deleteUser(userId) {
        const res = await axios.delete(url + 'auth/admin/users/' + userId, {
            headers: this._headers()
        })
        return res.data
    }
}

export default ServerTalker
