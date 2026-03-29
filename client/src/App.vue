<template>
  <div id="pageContainer">
    <div id="pageContent">
    <Header/>
    <div v-if="!$auth.loading">

      <!-- Authenticated: show the routed component -->
      <div v-if="$auth.isAuthenticated && innerComponent">
        <component :is="innerComponent" :userID="userID" v-bind:prop="prop"></component>
      </div>

      <!-- Public pages (login, register, verify) -->
      <div v-else-if="isPublicPage">
        <component :is="innerComponent"></component>
      </div>

      <!-- Not logged in, not on a public page -->
      <div v-else class="text-center my-5">
        <h2 class="mb-3">Welcome to ScioApp</h2>
        <p class="text-muted mb-4">Practice for Science Olympiad with questions, timed tests, and rankings.</p>
        <a href="/login" class="btn btn-primary btn-lg me-2">Log in</a>
        <a href="/register" class="btn btn-outline-primary btn-lg">Sign up</a>
      </div>

    </div>
    <div v-else class="lds-ripple"><div></div><div></div></div>

    </div>

    <footer class="text-center">
      <p class="m-1">Developed by Alex Gulko for Solon High School Science Olympiad</p>
      <p class="m-1">&copy; {{new Date().getUTCFullYear()}}</p>
    </footer>

  </div>
</template>

<script>
import Header from './components/Header.vue'
import Feed from './components/Feed.vue'
import Question from './components/Question.vue'
import QuestionEditor from './components/QuestionEditor.vue'
import Library from './components/Library.vue'
import Profile from './components/Profile.vue'
import Ranking from './components/Ranking.vue'
import Test from './components/Test.vue'
import TestEditor from './components/TestEditor.vue'
import TestLibrary from './components/TestLibrary.vue'
import MADTON from './components/MADTON.vue'
import Login from './components/Login.vue'
import Register from './components/Register.vue'
import Verify from './components/Verify.vue'
import Admin from './components/Admin.vue'
import ForgotPassword from './components/ForgotPassword.vue'
import ResetPassword from './components/ResetPassword.vue'

export default {
  name: 'App',
  data() {
    return {
      innerComponent: undefined,
      prop: undefined,
      isPublicPage: false,
    }
  },
  components: {
    Question, Feed, Header, QuestionEditor, Library, Profile, Ranking,
    Test, TestEditor, TestLibrary, MADTON, Login, Register, Verify, Admin,
    ForgotPassword, ResetPassword,
  },
  async mounted() {
    // Initialize auth (restore session from localStorage)
    await this.$auth.init()

    const path = window.location.pathname.split('/')
    path.splice(0, 1)

    // Public pages — accessible without login
    const publicPages = { 'login': 'Login', 'register': 'Register', 'verify': 'Verify', 'forgot-password': 'ForgotPassword', 'reset-password': 'ResetPassword' }
    if (publicPages[path[0]]) {
      this.innerComponent = publicPages[path[0]]
      this.isPublicPage = true
      return
    }

    // Everything else requires auth
    switch (path[0]) {
      case '':
        this.innerComponent = 'Feed'
        break
      case 'question':
        if (path[1] === 'editor') this.innerComponent = 'QuestionEditor'
        else if (path[1] === 'library') this.innerComponent = 'Library'
        else { this.innerComponent = 'Question'; this.prop = path[1] }
        break
      case 'ranking':
        this.innerComponent = 'Ranking'
        break
      case 'profile':
        this.innerComponent = 'Profile'
        break
      case 'test':
        if (path[1] === 'editor') this.innerComponent = 'TestEditor'
        else if (path[1] === 'library') this.innerComponent = 'TestLibrary'
        else { this.innerComponent = 'Test'; this.prop = path[1] }
        break
      case 'MADTON':
        this.innerComponent = 'MADTON'
        break
      case 'admin':
        this.innerComponent = 'Admin'
        break
      default:
        this.innerComponent = 'Feed'
        break
    }
  },
  computed: {
    userID() {
      return this.$auth.isAuthenticated ? this.$auth.user.id : null
    },
  }
}
</script>

<style>
  #pageContainer {
    position: relative;
    display: flex;
    flex-direction: column;
  }
  #pageContent {
    min-height: 90vh;
  }
  footer {
    bottom: 0;
    height: 3rem;
    width: 100%;
    border-top: 1px solid #d5d5d5;
    padding-top: 10px;
  }

  .lds-ripple {
    margin: 50px auto;
    position: relative;
    width: 80px;
    height: 80px;
  }
  .lds-ripple div {
    position: absolute;
    border: 4px solid var(--bs-primary);
    opacity: 1;
    border-radius: 50%;
    animation: lds-ripple 1s cubic-bezier(0, 0.2, 0.8, 1) infinite;
  }
  .lds-ripple div:nth-child(2) {
    animation-delay: -0.5s;
  }
  @keyframes lds-ripple {
    0% {
      top: 36px;
      left: 36px;
      width: 0;
      height: 0;
      opacity: 0;
    }
    4.9% {
      top: 36px;
      left: 36px;
      width: 0;
      height: 0;
      opacity: 0;
    }
    5% {
      top: 36px;
      left: 36px;
      width: 0;
      height: 0;
      opacity: 1;
    }
    100% {
      top: 0px;
      left: 0px;
      width: 72px;
      height: 72px;
      opacity: 0;
    }
  }

</style>
