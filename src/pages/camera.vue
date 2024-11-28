<template>
    <div class="camera-component">
        <video v-if="!capturedImage" ref="video" autoplay playsinline class="video-preview"></video>
        <div v-if="capturedImage">
            <img :src="capturedImage" alt="Captured Image" style="max-width: 100%; max-height: 300px;" />
        </div>
        <button @click="captureAndEmit" class="capture-button">Ambil & Gunakan Gambar</button> 
        <canvas ref="canvas" class="image-preview"></canvas>
    </div>
</template>

<script setup>
    import { ref, onMounted, onUnmounted } from "vue";

    // Definisikan emit event
    const emit = defineEmits(['image-captured', 'camera-error']);

    const video = ref(null);
    const canvas = ref(null);
    const stream = ref(null);
    const capturedImage = ref(null);

    const captureAndEmit = () => {
        const context = canvas.value.getContext("2d");
        canvas.value.width = video.value.videoWidth;
        canvas.value.height = video.value.videoHeight;
        context.drawImage(video.value, 0, 0, canvas.value.width, canvas.value.height);

        capturedImage.value = canvas.value.toDataURL('image/jpeg');
        emit('image-captured', capturedImage.value); // Emit gambar ke komponen induk
    };

    const startCamera = async () => {
        try {
            stream.value = await navigator.mediaDevices.getUserMedia({
                video: true
            });
            video.value.srcObject = stream.value;
        } catch (err) {
            console.error("Error akses kamera:", err);
            alert("Tidak dapat mengakses kamera. Pastikan izin kamera diberikan.");
            emit('camera-error', err); // Emit error ke komponen induk
        }
    };

    const stopCamera = () => {
        if (stream.value) {
            stream.value.getTracks().forEach(track => track.stop());
        }
    };

    onMounted(startCamera);
    onUnmounted(stopCamera);
</script>

<style scoped>
    .camera-component {
        display: flex;
        flex-direction: column;
        /* Align items vertically */
        align-items: center;
        /* Center horizontally */
        width: 100%;
        /* Or a specific width */
    }

    .video-preview {
        width: 100%;
        max-height: 300px;
        /* Or preferred max-height */
        object-fit: cover;
        margin-bottom: 10px;
    }

    .capture-button,
    .use-image-button {
        /* Style both buttons */
        margin-top: 10px;
        padding: 10px 20px;
        font-size: 16px;
        color: white;
        background-color: #007bff;
        border: none;
        border-radius: 8px;
        cursor: pointer;
    }

    .capture-button:hover,
    .use-image-button:hover {
        background-color: #0056b3;
    }

    .image-preview {
        display: none;
    }

    /* Mobile responsiveness */
    @media (max-width: 768px) {
        .video-preview {
            max-height: 200px;
        }
    }
</style>