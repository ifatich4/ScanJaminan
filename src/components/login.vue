// src/components/login.vue
<template>
  <div>
    <h2>Login</h2>
    <input type="email" v-model="email" placeholder="Email" />
    <input type="password" v-model="password" placeholder="Password" />
    <button @click="login">Login</button>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useRouter } from 'vue-router';
import { auth } from '../firebase/firebase';

const email = ref('');
const password = ref('');
const router = useRouter();

const login = async () => {
  try {
    await signInWithEmailAndPassword(auth, email.value, password.value);
    router.push('/profile');
  } catch (error) {
    console.error('Login failed', error);
    alert('Login failed: ' + error.message);
  }
};
</script>
