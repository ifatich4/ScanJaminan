import { createRouter, createWebHistory } from 'vue-router';
import Login from './components/login.vue'; // Mengimpor komponen halaman login
import UserProfile from './pages/userProfile.vue'; // Mengimpor komponen halaman profil pengguna
import DetailUser from './pages/DetailUser.vue'; // Mengimpor komponen halaman detail pengguna
import camera from './pages/camera.vue';

const routes = [
  { path: '/', component: Login },
  { path: '/login', component: Login },
  { path: '/profile', component: UserProfile },
  { path: '/detail-user/:id', name: 'DetailPage', component: DetailUser }, // Tambahkan "name"
  { path: '/camera', name: 'camera', component: camera },
];

const router = createRouter({
  history: createWebHistory(), // Menggunakan mode sejarah berbasis HTML (tanpa hash #)
  routes, // Daftar rute yang telah didefinisikan
});

export default router; // Mengekspor router untuk digunakan di aplikasi
