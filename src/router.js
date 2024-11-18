// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router';
import Login from './components/login.vue';
import UserProfile from './pages/userProfile.vue';

const routes = [
  { path: '/', component: Login },
  { path: '/login', component: Login },
  { path: '/profile', component: UserProfile },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
