// src/main.js
import { createApp } from 'vue';
import App from './App.vue';
import router from './router';

// Import Bootstrap and BootstrapVue CSS files (order is important)
import {createBootstrap} from 'bootstrap-vue-next'
import 'bootstrap/dist/css/bootstrap.css'
import 'bootstrap-vue-next/dist/bootstrap-vue-next.css'

// Import Firebase configuration
import './firebase/firebase';

const app = createApp(App); // Create the app instance
app.use(createBootstrap()); // Use BootstrapVue
app.use(router);            // Use the router
app.mount('#app');          // Mount the app to the DOM. MUST be in main.js