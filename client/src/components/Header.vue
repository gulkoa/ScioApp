<template>
      <header class="p-1 border-bottom">
      <div class="container">
        <div class="d-flex flex-wrap align-items-center justify-content-center justify-content-lg-start">
          
          <img v-if="isNats" src="../assets/gold tape.png" style="height: 90px" class="me-5">

          <a href="/" class="d-flex align-items-center m-2 me-5">
            <img src="../assets/ScioApp logo.png" style="height: 42px">
            <!--svg class="bi me-2" width="40" height="32" role="img" aria-label="Bootstrap"><use xlink:href="#bootstrap"></use></svg-->
          </a>

          
  
          <ul class="nav col-12 col-lg-auto me-lg-auto mb-2 justify-content-center mb-md-0">
            <li><a href="/" class="nav-link px-2 link-secondary">Feed</a></li>
            <li><a href="/question/library" class="nav-link px-2 link-secondary">Library</a></li>
            <li><a href="/question/editor" class="nav-link px-2 link-secondary">Editor</a></li>
            <li><a href="/test/library" class="nav-link px-2 link-secondary">Tests</a></li>
            <li><a href="/MADTON" class="nav-link px-2 link-secondary">MADTON</a></li>
          </ul>
  
          <!-- <form class="col-12 col-lg-auto mb-3 mb-lg-0 me-lg-3">
            <input type="search" class="form-control" placeholder="Search..." aria-label="Search">
          </form> -->

          <div v-if="!$auth.loading">
  
          <div v-if="$auth.isAuthenticated" class="dropdown text-end">
            <a href="#" class="d-block link-dark text-decoration-none dropdown-toggle" id="dropdownUser1" data-bs-toggle="dropdown" aria-expanded="false">
              <img :src="$auth.user.picture" alt="userPicture" class="rounded-circle" width="32" height="32">
                <span class="p-2">{{ $auth.user.name }}</span>
            </a>
            <ul class="dropdown-menu text-small p-1" aria-labelledby="dropdownUser1">

              <li><a class="dropdown-item" href="/profile">Profile</a></li>
              <!-- <li><hr class="dropdown-divider"></li> -->

              <!-- <li><GroupMode/></li> -->
              
              <li><button class="dropdown-item" @click="logout">Sign out</button></li>
            </ul>
          </div>

          <div v-if="!$auth.isAuthenticated" class="text-end">
            <button class="btn btn-primary" @click="loginRedirect">Log in / Sign up</button>
          </div>

          </div>

              
        </div>
      </div>
    </header>
</template>

<script>
//import GroupMode from './GroupMode.vue'
export default {
    data() {
        return {

        }
    },
    components: {
      //GroupMode
    },
    methods: {
        loginRedirect() {
          this.$auth.loginWithRedirect()
        },

        logout() { 
            this.$auth.logout()
        },
    },
    computed: {
        isAuthenticated() {
          return this.$auth.isAuthenticated
        },
        auth() {
          return this.$auth
        },

        isNats() {
          const date = new Date()
          const thisMonth = date.getMonth() + 1
          return thisMonth >= 3 && thisMonth <= 5
        }
    }
}
</script>
