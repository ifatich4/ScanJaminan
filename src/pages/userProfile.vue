<template>
    <div v-if="user">
      <h2>User Profile</h2>
      <p><strong>Email:</strong> {{ user.email }}</p>
      <p><strong>UID:</strong> {{ user.uid }}</p>
      <button @click="logout">Logout</button>
    </div>
    <div v-else>
      <p>Please log in first.</p>
    </div>
  </template>
  
  <script setup>
  import { ref, onMounted } from 'vue';
  import { useRouter } from 'vue-router';
  import { auth } from '../firebase/firebase';
  import { signOut } from 'firebase/auth';
  
  const user = ref(null);
  const router = useRouter();
  
  onMounted(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (currentUser) {
        user.value = currentUser;
      } else {
        router.push('/login'); // Jika belum login, arahkan ke halaman login
      }
    });
  
    // Bersihkan listener saat komponen di-unmount
    return () => unsubscribe();
  });
  
  const logout = async () => {
    try {
      await signOut(auth);
      router.push('/login'); // Arahkan ke halaman login setelah logout
    } catch (error) {
      console.error('Logout failed', error);
    }
  };
  </script>
  
  <style scoped>
  button {
    margin-top: 1em;
    padding: 0.75em;
    background-color: #ff4d4f;
    color: white;
    border: none;
    cursor: pointer;
  }
  button:hover {
    background-color: #ff3333;
  }
  </style>
  