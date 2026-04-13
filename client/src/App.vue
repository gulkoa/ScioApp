<template>
  <div id="pageContainer">
    <div id="pageContent">
    <Header/>
    <div v-if="!$auth.loading">

      <!-- Authenticated, or public page: render the routed component -->
      <div v-if="$auth.isAuthenticated || isPublicPage" :key="$route.fullPath" class="route-fade">
        <router-view :userID="userID"/>
      </div>

      <!-- Not logged in, not on a public page -->
      <div v-else class="text-center my-5">
        <h2 class="mb-3">Welcome to ScioApp</h2>
        <p class="text-muted mb-4">Practice for Science Olympiad with questions, timed tests, and rankings.</p>
        <router-link to="/login" class="btn btn-primary btn-lg me-2">Log in</router-link>
        <router-link to="/register" class="btn btn-outline-primary btn-lg">Sign up</router-link>
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

export default {
  name: 'App',
  components: { Header },
  async created() {
    // Initialize auth (restore session from localStorage)
    await this.$auth.init()

    // Save intended destination so Login can redirect back after auth
    if (!this.$auth.isAuthenticated && !this.isPublicPage) {
      const intendedPath = this.$route.fullPath
      if (intendedPath !== '/') sessionStorage.setItem('loginRedirect', intendedPath)
    }
  },
  computed: {
    userID() {
      return this.$auth.isAuthenticated ? this.$auth.user.id : null
    },
    isPublicPage() {
      return !!(this.$route.meta && this.$route.meta.public)
    }
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
  /* Subtle fade on route change so SPA navigation feels smooth */
  .route-fade {
    animation: routeFadeIn 180ms ease-out;
  }
  @keyframes routeFadeIn {
    from { opacity: 0; transform: translateY(4px); }
    to   { opacity: 1; transform: translateY(0); }
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
