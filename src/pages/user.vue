<script setup>
    import { ref } from "vue";
    import { createClient } from "@supabase/supabase-js";
    import { getFirestore, doc, collection, getDocs, getDoc, updateDoc, arrayUnion } from "firebase/firestore";
    import { QrcodeStream } from "vue3-qrcode-reader";
    import { BButton, BFormFile, BImg, BSpinner, BOffcanvas, BModal, BRow, BCol } from "bootstrap-vue-next";

    // Inisialisasi Supabase Client
    const supabaseUrl = "https://obqojequpinlinynnisz.supabase.co";
    const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9icW9qZXF1cGlubGlueW5uaXN6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMjA3ODA0MSwiZXhwIjoyMDQ3NjU0MDQxfQ.kcoCsvVgnYwIvRKg8vbSxAqMA4_QjOHuTtOF954-3EY"; 

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Inisialisasi Firebase
    const db = getFirestore();

    // State Management
    const sbgId = ref(null);
    const uid = ref(null);
    const userData = ref({});
    const credit = ref(null);
    const scanning = ref(true);
    const imageUrls = ref([]);
    const selectedImage = ref(null);
    const uploadStatus = ref(null);
    const loadingImages = ref(false);
    const show = ref(false);
    const isLoading = ref(false);
    const documentIds = ref([]);

    // Fungsi untuk menangani error
    const handleError = (message) => {
        console.error(message);
    };

    // Fungsi yang dijalankan saat berhasil memindai QR code
    const onDecode = (decodedString) => {
        sbgId.value = decodedString;
        scanning.value = false;
        fetchSbgIdData(decodedString);
    };

    // Ambil data berdasarkan sbgId
    const fetchSbgIdData = async (sbgId) => {
        try {
            showLoading();

            const sbgDocRef = doc(db, "sbgIds", sbgId);
            const sbgDocSnap = await getDoc(sbgDocRef);

            if (!sbgDocSnap.exists()) {
                return handleError("sbgId tidak ditemukan.");
            }

            const {
                uid: fetchedUid
            } = sbgDocSnap.data();
            uid.value = fetchedUid;

            await fetchUserData(fetchedUid);
            await fetchCreditData(fetchedUid);
            await fetchUserImages(fetchedUid);

            show.value = true;
        } catch (error) {
            handleError(`Error fetching data for sbgId: ${error.message}`);
        } finally {
            hideLoading();
        }
    };

    // Ambil data pengguna berdasarkan UID
    const fetchUserData = async (uid) => {
        try {
            const userDataColRef = collection(db, "users", uid, "UserData");
            const userDataColSnap = await getDocs(userDataColRef);
            if (userDataColSnap.empty) {
                return handleError("UserData tidak ditemukan.");
            }
            userData.value = userDataColSnap.docs[0].data();
        } catch (error) {
            handleError(`Error fetching UserData: ${error.message}`);
        }
    };

    // Ambil data kredit pengguna
    const fetchCreditData = async (uid) => {
        try {
            const creditColRef = collection(db, "users", uid, "Credit");
            const creditColSnap = await getDocs(creditColRef);
            if (creditColSnap.empty) {
                return handleError("Credit tidak ditemukan.");
            }
            credit.value = creditColSnap.docs[0] ?.data() || null;
        } catch (error) {
            handleError(`Error fetching Credit data: ${error.message}`);
        }
    };

    // Ambil gambar pengguna berdasarkan UID
    const fetchUserImages = async (uid) => {
        loadingImages.value = true;
        try {
            const userImageColRef = collection(db, "users", uid, "UserImage");
            const userImageColSnap = await getDocs(userImageColRef);
            documentIds.value = userImageColSnap.docs.map((doc) => doc.id);

            if (userImageColSnap.empty) {
                return handleError("UserImage tidak ditemukan.");
            }

            const imagePromises = userImageColSnap.docs.map((doc) => {
                const imageNames = doc.data() ?.image;
                if (Array.isArray(imageNames) && imageNames.length > 0) {
                    return Promise.all(imageNames.map((name) => getSupabaseImageUrl(name)));
                } else {
                    return null;
                }
            }).filter(Boolean);

            const resolvedImageUrls = await Promise.all(imagePromises);
            imageUrls.value = resolvedImageUrls.flat();
        } catch (error) {
            handleError(`Error fetching UserImages: ${error.message}`);
        } finally {
            loadingImages.value = false;
        }
    };

    // Dapatkan URL gambar dari Supabase
    async function getSupabaseImageUrl(imageName) {
        try {
            const {
                data,
                error
            } = await supabase.storage.from("ScanJaminan").download(imageName);
            if (error) {
                return null;
            }
            return URL.createObjectURL(data);
        } catch (error) {
            return null;
        }
    }

    // Konversi gambar ke format WebP
    const convertToWebP = (file) => {
        return new Promise((resolve, reject) => {
            const img = document.createElement("img");
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");

            const reader = new FileReader();
            reader.onload = () => {
                img.src = reader.result;
                img.onload = () => {
                    canvas.width = img.width / 2;
                    canvas.height = img.height / 2;

                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                    canvas.toBlob(
                        (blob) => resolve(blob),
                        "image/webp",
                        0.3
                    );
                };
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    // Fungsi untuk mengunggah gambar
    const onFileChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            selectedImage.value = file;
        } else {
            selectedImage.value = null;
        }
    };

    // Proses unggah gambar
    const uploadImage = async () => {
        uploadStatus.value = "Uploading...";

        if (!selectedImage.value) {
            alert("Tidak ada gambar yang dipilih. Pilih gambar untuk diunggah.");
            return;
        }

        try {
            const webPImage = await convertToWebP(selectedImage.value);
            const fileName = `${Date.now()}-${selectedImage.value.name.replace(/\.[^/.]+$/, ".webp")}`;

            const {
                data,
                error
            } = await supabase.storage
                .from("ScanJaminan")
                .upload(fileName, webPImage);

            if (error) {
                alert("Gagal mengunggah gambar.");
                return;
            }

            const userImageRef = doc(db, "users", uid.value, "UserImage", documentIds.value[0]);

            await updateDoc(userImageRef, {
                image: arrayUnion(fileName),
            });

            alert("Gambar berhasil diunggah!");
        } catch (error) {
            alert(`Error during upload: ${error.message}`);
        } finally {
            uploadStatus.value = null;
        }
    };

    // Tampilkan loading
    const showLoading = () => {
        isLoading.value = true;
    };

    // Sembunyikan loading
    const hideLoading = () => {
        isLoading.value = false;
    };
</script>

<template>
    <div>
        <qrcode-stream class="qrcode-stream" @decode="onDecode" style="width: 100vw; height: 100vh;" v-if="!show">
        </qrcode-stream>
        
        <BModal v-model="isLoading" centered title="Loading">
            <BSpinner />
        </BModal>

        <BModal v-model="errorLoadData" centered title="Loading">
            <p>Data tidak Ditemukan</p>
        </BModal>

        <BOffcanvas v-model="show" placement="bottom" title="User Details" style="height: fit-content; max-height: 50vh;">
            <div v-if="userData.name">
                <h2>User: {{ userData.name }}</h2>
                <p>Credit: {{ credit ? credit.limit : 'No credit info' }}</p>
            </div>

            <div v-if="loadingImages">
                <p>Loading images...</p>
                <BSpinner />
            </div>

            <BRow v-else-if="imageUrls.length">
                <BCol v-for="(url, index) in imageUrls" :key="index">
                    <BImg thumbnail fluid :src="url" alt="Image" />
                </BCol>
            </BRow>

            <div v-if="userData.name">
                <h2>Upload Image</h2>
                <BFormFile multiple class="mb-3" size="lg" accept="image/*" type="file" @change="onFileChange" />
                <BButton @click="uploadImage">Upload Image</BButton>
            </div>
        </BOffcanvas>
    </div>
</template>

<style scoped>
    .offcanvas {
        height: fit-content;
        max-height: 50vh;
    }
</style>
