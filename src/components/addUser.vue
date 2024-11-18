// src/components/AddUser.vue
<template>
    <div>
        <h2>Add User</h2>
        <input type="text" v-model="name" placeholder="Name" />
        <button @click="addUser">Add User</button>
    </div>
</template>

<script>
    import {
        ref
    } from "vue";
    import {
        collection,
        addDoc
    } from "firebase/firestore";
    import {
        db
    } from "../firebase/firebase"; // Import Firestore

    export default {
        setup() {
            const name = ref("");

            const addUser = async () => {
                try {
                    await addDoc(collection(db, "users"), {
                        name: name.value,
                        createdAt: new Date(),
                    });
                    alert("User Added!");
                } catch (error) {
                    console.error("Error adding user: ", error);
                }
            };

            return {
                name,
                addUser
            };
        },
    };
</script>