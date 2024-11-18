// src/main.js
import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import './firebase/firebase'; // Your Firebase initialization

const app = createApp(App);  // Create the app instance
app.use(router);            // Use the router
app.mount('#app');          // Mount the app to the DOM. MUST be in main.js