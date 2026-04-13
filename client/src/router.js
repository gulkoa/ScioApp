import Vue from 'vue'
import VueRouter from 'vue-router'

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
import PublicProfile from './components/PublicProfile.vue'

Vue.use(VueRouter)

// `prop` is exposed as a prop to keep components working without changes.
// `meta.public` marks pages accessible while logged out.
const routes = [
    { path: '/',                  component: Feed },
    { path: '/question/editor',   component: QuestionEditor },
    { path: '/question/library',  component: Library },
    { path: '/question/:id',      component: Question, props: r => ({ prop: r.params.id }) },
    { path: '/ranking',           component: Ranking },
    { path: '/profile',           component: Profile },
    { path: '/profile/:id',       component: PublicProfile, props: r => ({ prop: r.params.id }) },
    { path: '/test/editor',       component: TestEditor },
    { path: '/test/library',      component: TestLibrary },
    { path: '/test/:id',          component: Test, props: r => ({ prop: r.params.id }) },
    { path: '/MADTON',            component: MADTON },
    { path: '/admin',             component: Admin },
    { path: '/login',             component: Login,          meta: { public: true } },
    { path: '/register',          component: Register,       meta: { public: true } },
    { path: '/verify',            component: Verify,         meta: { public: true } },
    { path: '/forgot-password',   component: ForgotPassword, meta: { public: true } },
    { path: '/reset-password',    component: ResetPassword,  meta: { public: true } },
    { path: '*', redirect: '/' }
]

const router = new VueRouter({
    mode: 'history',
    routes,
    scrollBehavior() {
        // Scroll to top on every navigation
        return { x: 0, y: 0 }
    }
})

export default router
