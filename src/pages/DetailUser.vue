<script setup>
    import { onMounted, ref, computed } from "vue";
    import { useRoute } from "vue-router";
    import { getFirestore, collection, getDocs, doc, updateDoc, arrayUnion, deleteDoc, arrayRemove } from "firebase/firestore";
    import { getAuth } from "firebase/auth";

    import { createClient } from "@supabase/supabase-js";
    import { BAccordion, BButton, BRow } from "bootstrap-vue-next";
    import { useRouter } from "vue-router";
    import camera from "./camera.vue";


    const supabaseUrl = "https://obqojequpinlinynnisz.supabase.co";
    const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9icW9qZXF1cGlubGlueW5uaXN6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMjA3ODA0MSwiZXhwIjoyMDQ3NjU0MDQxfQ.kcoCsvVgnYwIvRKg8vbSxAqMA4_QjOHuTtOF954-3EY"; 

    const supabase = createClient(supabaseUrl, supabaseKey);

    const route = useRoute();
    const db = getFirestore();
    const selectedDetail = ref(null);
    const loading = ref(true);
    const errorMessage = ref(null);
    const show = ref(false);
    const fileInput = ref(null);
    const uploadStatus = ref(null);

    const uid = ref(null);

    const showCameraModal = ref(false);


    const capturedImages = ref([]); // Untuk menyimpan gambar yang diambil

    const handleCapturedImage = (imageData) => {
        capturedImages.value.push(imageData); // Tambahkan gambar ke daftar
        showCameraModal.value = false; // Tutup modal setelah gambar diambil
    };

    const deleteCapturedImage = (index) => {
        capturedImages.value.splice(index, 1); // Hapus gambar berdasarkan index
    };

    const handleCameraError = (error) => {
        console.error('Camera error:', error);
        alert('There was a problem accessing the camera.'); // Or other error handling
        showModal.value = false; // Close the modal on error
    }

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
            console.error(`Error fetching image URL: ${error.message}`);
            return null;
        }
    }

    const fetchData = async () => {
        const detailCreditId = route.params.id; // ID DetailCredit dari route params
        loading.value = true;

        try {
            const auth = getAuth();
            const uid = auth.currentUser ?.uid;

            if (!uid) {
                errorMessage.value = "USER_ID tidak ditemukan. Harap login kembali.";
                loading.value = false;
                return;
            }

            // Ambil data dari koleksi `Credit`
            const userCredentialsColRef = collection(db, "users");
            const userCredentialsSnap = await getDocs(userCredentialsColRef);
            const userCredentialsData = userCredentialsSnap.docs.map((userCredentialsDoc) => ({
                id: userCredentialsDoc.id,
                ...userCredentialsDoc.data(),
            }));

            // Ambil data dari koleksi `Credit`
            const creditColRef = collection(db, "users", uid, "DetailCredit", detailCreditId, "Credit");
            const creditSnap = await getDocs(creditColRef);
            const creditData = creditSnap.docs.map((creditDoc) => ({
                id: creditDoc.id,
                ...creditDoc.data(),
            }));

            // Ambil data dari koleksi `DetailJaminan`
            const detailJaminanColRef = collection(db, "users", uid, "DetailCredit", detailCreditId,
                "DetailJaminan");
            const detailJaminanSnap = await getDocs(detailJaminanColRef);
            const detailJaminanData = detailJaminanSnap.docs.map((jaminanDoc) => ({
                id: jaminanDoc.id,
                ...jaminanDoc.data(),
            }));

            // Fetch images
            const userImageColRef = collection(db, "users", uid, "DetailCredit", detailCreditId, "UserImage");
            const userImageSnap = await getDocs(userImageColRef);
            const userImageData = userImageSnap.docs.map((imageDoc) => ({
                id: imageDoc.id,
                ...imageDoc.data(),
            }));

            const imageUrls = await Promise.all(
                userImageData.map(async (imageDoc) => {
                    const imageNames = imageDoc.image;
                    if (Array.isArray(imageNames) && imageNames.length > 0) {
                        return Promise.all(imageNames.map((name) => getSupabaseImageUrl(name)));
                    }
                    return [];
                })
            );

            // Gabungkan semua data
            selectedDetail.value = {
                id: detailCreditId,
                userCredentialsData,
                creditData,
                detailJaminanData,
                userImageData,
                imageUrls: imageUrls.flat(),
            };
        } catch (error) {
            console.error("Error fetching data:", error);
            errorMessage.value = "Terjadi kesalahan saat mengambil data detail.";
        } finally {
            loading.value = false;
        }
    };

    onMounted(() => {
        fetchData();
    });

    const router = useRouter();

    const formatDate = (timestamp) => {
        if (timestamp && timestamp.toDate) {  // Check if it's a valid Timestamp
        const date = timestamp.toDate(); // Convert to JavaScript Date object
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Month is 0-indexed
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
        }
        return "Invalid Date"; // Or handle the case where timestamp is null/undefined
    };

    const clickAddFoto = (event) => {
        show.value = true;
    };

    const closeAddFoto = (event) => {
        show.value = false;
    };
    
    // Fungsi untuk menghapus gambar
    const deleteImage = async (index) => {
        if (!confirm("Apakah Anda yakin ingin menghapus gambar ini?")) {
            return;
        }

        try {
            const detailCreditId = route.params.id;
            const auth = getAuth();
            const uid = auth.currentUser?.uid;
            const imageName = selectedDetail.value.userImageData[0].image[index]; // Get the image name
            
            // 1. Delete from Supabase Storage
            const { error: storageError } = await supabase.storage.from('ScanJaminan').remove([imageName]);
            if (storageError) {
                throw storageError; // Re-throw the error to be caught by the catch block
            }


            //2. Delete from Firestore
            const userImageColRef = collection(db, "users", uid, "DetailCredit", detailCreditId, "UserImage");
            const userImageSnap = await getDocs(userImageColRef);
            const documentId = userImageSnap.docs[0]?.id;
            if (!documentId) {
                throw new Error("No UserImage document found.");
            }

            const userImageRef = doc(db, "users", uid, "DetailCredit", detailCreditId, "UserImage", documentId);
            await updateDoc(userImageRef, {
                    image: arrayRemove(imageName) // Update Firestore array using 'arrayRemove'
            });



            // Update the UI
            selectedDetail.value.imageUrls.splice(index, 1);
            selectedDetail.value.userImageData[0].image.splice(index, 1);

            await fetchData();  // Call fetchData to fully refresh the data
            alert("Gambar berhasil dihapus!");

        } catch (error) {
            console.error("Error deleting image:", error);
            alert(`Error deleting image: ${error.message}`);
        }
    };

    // Proses unggah gambar
    const uploadImage = async () => {
        uploadStatus.value = "Uploading...";

        if (
            (!selectedImages.value || selectedImages.value.length === 0) && 
            (!capturedImages.value || capturedImages.value.length === 0)
        ) {
            alert("Tidak ada gambar yang dipilih atau diambil. Pilih atau ambil gambar untuk diunggah.");
            return;
        }

        try {
            const auth = getAuth();
            const uid = auth.currentUser?.uid;

            if (!uid) {
                alert("Autentikasi gagal. Mohon login kembali.");
                return;
            }

            const detailCreditId = route.params.id;
            const errors = [];

            const uploadImage = async (file, isCaptured) => {
                try {
                    const webPImage = isCaptured
                        ? await convertToWebP(await fetch(file).then(res => res.blob()))
                        : await convertToWebP(file);
                    const fileName = isCaptured
                        ? `${Date.now()}-captured.webp`
                        : `${Date.now()}-${file.name.replace(/\.[^/.]+$/, ".webp")}`;
                    const { error: uploadError } = await supabase.storage.from("ScanJaminan").upload(fileName, webPImage);

                    if (uploadError) throw uploadError;

                    const userImageColRef = collection(db, "users", uid, "DetailCredit", detailCreditId, "UserImage");
                    const userImageSnap = await getDocs(userImageColRef);
                    if (userImageSnap.empty) throw new Error("No UserImage document found.");

                    const documentId = userImageSnap.docs[0]?.id;
                    const userImageRef = doc(db, "users", uid, "DetailCredit", detailCreditId, "UserImage", documentId);

                    await updateDoc(userImageRef, { image: arrayUnion(fileName) });
                } catch (error) {
                    errors.push({ file, message: error.message });
                }
            };

            await Promise.all([
                ...selectedImages.value.map(file => uploadImage(file, false)),
                ...capturedImages.value.map(imageData => uploadImage(imageData, true)),
            ]);

            if (errors.length === 0) {
                alert("Semua gambar berhasil diunggah!");
                await fetchData(); // Refresh tampilan gambar
                closeAddFoto();
            } else if (errors.length < selectedImages.value.length + capturedImages.value.length) {
                alert(`${selectedImages.value.length + capturedImages.value.length - errors.length} gambar berhasil diunggah, ${errors.length} gagal.`);
            } else {
                alert("Semua gambar gagal diunggah. Periksa log untuk detailnya.");
            }

        } catch (error) {
            console.error("Upload error:", error);
            alert(`Error during upload: ${error.message}`);
        } finally {
            uploadStatus.value = null;
            selectedImages.value = [];
            capturedImages.value = [];
        }
    };


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

    const selectedImages = ref([]); // Array untuk menyimpan semua file yang dipilih

    // Fungsi untuk menangani perubahan input file
    const onFileChange = (event) => {
        const files = Array.from(event.target.files); // Mengonversi FileList ke array
        if (files.length > 0) {
            selectedImages.value = [...selectedImages.value, ...files]; // Tambahkan file baru ke array
        }
    };

    // Fungsi untuk menghapus file tertentu dari array
    const deleteSelectedImage = (index) => {
        selectedImages.value.splice(index, 1); // Hapus file berdasarkan indeks
    };

    // Fungsi untuk membuat URL objek dari file
    const createObjectURL = (file) => {
        return URL.createObjectURL(file);
    };

    // Fungsi untuk memicu input file
    const triggerFileInput = () => {
        fileInput.value.click();
    };

    const openCamera = () => {
        router.push({
            name: "camera",
        });
    };

</script>

<template>
    <div class="container">
        <div class="row" style="margin-bottom: 120px;">
            <div class="col-12 p-4">
                <div v-if="loading">
                    <BSpinner />
                </div>
                <div v-else-if="errorMessage" class="flex" style="">
                    <div class="card" style="border-radius: 1.5rem;">
                        <div class="card-body">
                            <div class="kappa mb-2">Session telah habis</div>
                            <div class="omicron" style="color: #58585B; font-weight: 600 !important;">Silakan lakukan <a class="green" @click="router.back()">scan ulang</a> untuk melanjutkan penambahan foto barang jaminan.</div>
                        </div>
                    </div>
                </div>
                <div class="" v-else>
                    <!-- Tampilkan data DetailJaminan -->
                    <div class="card-body">
                        <div class="kappa mb-2">Tambah beberapa foto barang jaminan</div>
                        <div class="sigma">Kamu membutuhkan minimal 5 foto barang jaminan.</div>

                        <div class="d-flex my-4" style="overflow: scroll; gap: 1rem;">
                            <div class="card p-2" v-for="(url, index) in selectedDetail.imageUrls" :key="index" style="width: 180px; min-width: 180px; aspect-ratio: 1 / 1; border-radius: 1.5rem;">
                                <BButton @click="deleteImage(index)" variant="dark" style="position: absolute; top: 1rem; right: 1rem; padding: 0; border-radius: 100%; width: 42px; height: 42px; background-color: #000000bd;">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                                        <path fill-rule="evenodd" clip-rule="evenodd" d="M15.5 4H18C18.55 4 19 4.45 19 5C19 5.55 18.55 6 18 6H6C5.45 6 5 5.55 5 5C5 4.45 5.45 4 6 4H8.5L9.21 3.29C9.39 3.11 9.65 3 9.91 3H14.09C14.35 3 14.61 3.11 14.79 3.29L15.5 4ZM8 21C6.9 21 6 20.1 6 19V9C6 7.9 6.9 7 8 7H16C17.1 7 18 7.9 18 9V19C18 20.1 17.1 21 16 21H8Z" fill="white"/>
                                    </svg>
                                </BButton>
                                <BImg :src="url" alt="Image" style="width: 100%; aspect-ratio: 1 / 1; object-fit: cover; border-radius: 1rem;" />
                            </div>
                        </div>

                        <BButton @click="clickAddFoto" size="lg" variant="outline-light" class="w-100 mb-4 omicron d-flex" style="height: 72px; border-radius: 32px; gap: 12px; align-items: center; color: #252528; font-weight: 600!important; border-color: #EEEEEF; padding: 1rem 1.5rem;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                                <path fill-rule="evenodd" clip-rule="evenodd" d="M13.4145 4.2842C13.3457 3.56358 12.7387 3 12 3C11.2152 3 10.5789 3.63623 10.5789 4.42105V10.5789H4.42105L4.2842 10.5855C3.56358 10.6543 3 11.2613 3 12C3 12.7848 3.63623 13.4211 4.42105 13.4211H10.5789V19.5789L10.5855 19.7158C10.6543 20.4364 11.2613 21 12 21C12.7848 21 13.4211 20.3638 13.4211 19.5789V13.4211H19.5789L19.7158 13.4145C20.4364 13.3457 21 12.7387 21 12C21 11.2152 20.3638 10.5789 19.5789 10.5789H13.4211V4.42105L13.4145 4.2842Z" fill="#252528"/>
                            </svg>
                            Tambah Foto Barang Jaminan
                        </BButton>
                        <!-- <BButton @click="showCameraModal = true" size="lg" variant="outline-light" class="w-100 mb-4 omicron d-flex" style="height: 72px; border-radius: 32px; gap: 12px; align-items: center; color: #252528; font-weight: 600!important; border-color: #EEEEEF; padding: 1rem 1.5rem;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                                <path fill-rule="evenodd" clip-rule="evenodd" d="M12 4L12.7101 4.00359C13.8499 4.01547 14.7726 4.05645 15.5001 4.12066C16.6394 4.2201 17.533 5.10353 17.6105 6.20468L17.6323 6.54933L18.3516 6.58092C18.5678 6.59121 18.7724 6.60201 18.965 6.61327L19.4642 6.64532C20.647 6.72833 21.6106 7.54377 21.75 8.62127C21.9061 9.83137 22 11.3607 22 13.2308C22 15.101 21.906 16.6307 21.75 17.8394C21.6106 18.9176 20.6472 19.7332 19.4648 19.8162L18.8207 19.857C17.2266 19.947 14.9894 20 12 20L10.3729 19.9943C7.79496 19.9757 5.88058 19.9117 4.53578 19.8162C3.35282 19.7332 2.38935 18.9176 2.24999 17.8393C2.09398 16.6307 2 15.101 2 13.2308C2 11.3607 2.09394 9.83137 2.25001 8.62127C2.38942 7.54377 3.35304 6.72833 4.5355 6.64534C4.93502 6.61712 5.40184 6.59108 5.93171 6.56803L6.36672 6.55015L6.38955 6.2041C6.46698 5.10353 7.36062 4.2201 8.49933 4.12071C9.3743 4.04358 10.5273 4 12 4ZM20.4658 8.68008C20.3606 8.24984 19.9272 7.91184 19.3712 7.87282L18.693 7.83079C18.4481 7.81743 18.1846 7.80477 17.9031 7.79294L17.0054 7.76008L16.4172 7.74144L16.3634 6.70555C16.3547 6.5573 16.3458 6.41755 16.3368 6.28739C16.3018 5.78976 15.8987 5.39125 15.3844 5.34636L14.9446 5.31231C14.1716 5.26006 13.1971 5.23077 12 5.23077L11.3085 5.23423C10.1999 5.24569 9.30987 5.28516 8.615 5.34642C8.10134 5.39125 7.69823 5.78976 7.66326 6.28681L7.62369 6.93413L7.58284 7.74144L6.38438 7.7814C5.6998 7.80767 5.1117 7.83871 4.62847 7.87284C4.0331 7.91462 3.57811 8.29965 3.51682 8.77337C3.37892 9.84261 3.29092 11.1848 3.27819 12.8167L3.2766 13.2308C3.2766 15.0513 3.36746 16.5303 3.5168 17.6872C3.57815 18.1618 4.03301 18.5469 4.62901 18.5887L5.04115 18.6159C6.47282 18.7031 8.48624 18.7585 11.1735 18.7678H12.8265C15.7825 18.7575 17.9232 18.6915 19.3715 18.5887C19.967 18.5469 20.4219 18.1618 20.4832 17.6873C20.6325 16.5303 20.7234 15.0513 20.7234 13.2308C20.7234 11.5504 20.646 10.1612 20.5166 9.04637L20.4832 8.77337L20.4658 8.68008ZM11.8123 17.5351C9.19675 17.4399 7.10638 15.3654 7.10638 12.8205C7.10638 10.215 9.29748 8.10256 12 8.10256C14.7025 8.10256 16.8936 10.215 16.8936 12.8205C16.8936 15.3654 14.8032 17.4399 12.1877 17.5351L12 17.5385L11.8123 17.5351ZM12 9.33333C10.0025 9.33333 8.38298 10.8947 8.38298 12.8205C8.38298 14.6896 9.90866 16.2155 11.8248 16.3037L11.9999 16.3077L12.1752 16.3037C14.0333 16.2182 15.5242 14.7808 15.6129 12.9895L15.617 12.8205C15.617 10.8947 13.9975 9.33333 12 9.33333Z" fill="#58585B"/>
                            </svg>
                            Tambah foto dari camera
                        </BButton> -->

                        <!-- <BModal v-model="showCameraModal" title="Ambil Gambar">
                            <camera @image-captured="handleCapturedImage" @camera-error="handleCameraError" v-if="showCameraModal" />
                        </BModal> -->

                        <BAccordion class="accordion-custom" free v-for="userCredential in selectedDetail.userCredentialsData" :key="userCredential.id">
                            <BAccordionItem>
                                <template #title>
                                    <div style="display: flex; align-items: center; justify-content: space-between; cursor: pointer;">
                                        
                                        <div class="card me-3" style="border-radius: 1.5rem;">
                                            <div class="card-body">
                                                <BImg src="https://obqojequpinlinynnisz.supabase.co/storage/v1/object/public/ScanJaminan/sub-menu.png" fluid alt="Fluid image" style="width: 48px; height: 48px;"/>
                                                <div class="omicron text-reguler mt-2" style="font-weight: 600 !important;">Barang Gudang</div>
                                            </div>
                                        </div>

                                        <div @click="toggle">
                                            <div class="d-flex" style="flex-direction: column;">
                                                <div class="d-flex mb-2" style="flex-direction: column;">
                                                    <label>Nomor Kredit</label>
                                                    <div class="omicron">{{ userCredential.NomorKredit }} </div>
                                                </div>
                                                <div class="d-flex" style="flex-direction: column;">
                                                    <label>Tanggal Pinjaman</label>
                                                    <div class="omicron">{{ formatDate(userCredential.TanggalPinjaman) }} </div>
                                                </div>
                                            </div>
                                        </div>

                                    </div>
                                </template>

                                <BAccordion free>
                                <BAccordionItem class="mb-3">
                                    <template #title>
                                            
                                        <div @click="toggle" style="display: flex; align-items: center; justify-content: space-between; cursor: pointer; width: 100%;">
                                            <div class="omicron">Detail Nasabah</div>

                                            <span>
                                                <BImg src="https://obqojequpinlinynnisz.supabase.co/storage/v1/object/public/ScanJaminan/ico_profile.png" fluid alt="Fluid image" style="width: 24px; height: 24px;"/>
                                            </span>
                                        </div>

                                    </template>
                                    <div class="d-flex justify-content-spacebetween">
                                        <div class="w-100">
                                            <p>Nomor CIF: </p>
                                            <p>Nama: </p>
                                            <p>Alamat: </p>
                                        </div>
                                        <div>
                                            <p>{{ userCredential.CIF }}</p>
                                            <p>{{ userCredential.Nama }}</p>
                                            <p>{{ userCredential.alamat }}</p>
                                        </div>
                                    </div>
                                </BAccordionItem>
                                <BAccordionItem>
                                    <template #title>
                                            
                                        <div @click="toggle" style="display: flex; align-items: center; justify-content: space-between; cursor: pointer; width: 100%;">
                                            <div class="omicron">Keterangan dan Taksiran</div>

                                            <span>
                                                <BImg src="https://obqojequpinlinynnisz.supabase.co/storage/v1/object/public/ScanJaminan/ico_gadai.png" fluid alt="Fluid image" style="width: 24px; height: 24px;"/>
                                            </span>
                                        </div>

                                    </template>
                                    <div>
                                        <p>{{ userCredential.Keterangan }}</p>
                                        <div class="d-flex justify-content-spacebetween">
                                            <div class="w-100">
                                                <p>Taksiran :</p>
                                                <p>Uang Pinjaman :</p>
                                            </div>
                                            <div>
                                                <p>{{ userCredential.Taksiran }}</p>
                                                <p>{{ userCredential.Pinjaman }}</p>
                                            </div>
                                        </div>
                                    </div>
                                </BAccordionItem>
                                </BAccordion>
                            </BAccordionItem>
                        </BAccordion>

                    </div>
                </div>
            </div>
        </div>
        <BOffcanvas class="offcanvas offcanvas-noheader" v-model="show" placement="bottom" style="height: 100vh;">

            <div class="card" style="border-radius: 1.5rem;">
                <div class="card-body d-flex" style="justify-content: space-between; align-items: center;">
                    <BButton variant="link" @click="closeAddFoto">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path fill-rule="evenodd" clip-rule="evenodd" d="M7.97814 6.27576C7.50308 5.88357 6.79868 5.90971 6.3542 6.3542C5.88193 6.82646 5.88193 7.59215 6.3542 8.06441L10.7898 12.5L6.3542 16.9356C5.88193 17.4079 5.88193 18.1735 6.3542 18.6458C6.79868 19.0903 7.50308 19.1164 7.97814 18.7242L8.06441 18.6458L12.5 14.2102L16.9356 18.6458L17.0219 18.7242C17.4969 19.1164 18.2013 19.0903 18.6458 18.6458C19.1181 18.1735 19.1181 17.4079 18.6458 16.9356L14.2102 12.5L18.6458 8.06441C19.1181 7.59215 19.1181 6.82646 18.6458 6.3542C18.2013 5.90971 17.4969 5.88357 17.0219 6.27576L16.9356 6.3542L12.5 10.7898L8.06441 6.3542L7.97814 6.27576Z" fill="#58585B"/>
                        </svg>
                    </BButton>
                    <div class="content">
                        <div class="omicron">Upload foto barang jaminan</div>
                        <!-- <label for="sigma">5 Foto</label> -->
                    </div>
                    <BButton variant="link" @click="triggerFileInput">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path fill-rule="evenodd" clip-rule="evenodd" d="M13.4145 4.2842C13.3457 3.56358 12.7387 3 12 3C11.2152 3 10.5789 3.63623 10.5789 4.42105V10.5789H4.42105L4.2842 10.5855C3.56358 10.6543 3 11.2613 3 12C3 12.7848 3.63623 13.4211 4.42105 13.4211H10.5789V19.5789L10.5855 19.7158C10.6543 20.4364 11.2613 21 12 21C12.7848 21 13.4211 20.3638 13.4211 19.5789V13.4211H19.5789L19.7158 13.4145C20.4364 13.3457 21 12.7387 21 12C21 11.2152 20.3638 10.5789 19.5789 10.5789H13.4211V4.42105L13.4145 4.2842Z" fill="#58585B"/>
                        </svg>
                    </BButton>
                </div>
            </div>

            <div class="d-flex flex-wrap my-4" style="overflow: scroll; gap: 1rem; margin-bottom: 100px !important;" v-if="selectedDetail && selectedDetail.imageUrls">
                
                <!-- Image existing -->
                <div class="card p-2" v-for="(url, index) in selectedDetail.imageUrls" :key="index" style="width: calc(50% - 0.5rem); aspect-ratio: 1 / 1; border-radius: 1.5rem; overflow: hidden;" >
                    <BButton variant="dark" style="position: absolute; top: 1rem; right: 1rem; padding: 0; border-radius: 100%; width: 42px; height: 42px; background-color: #000000bd;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path fill-rule="evenodd" clip-rule="evenodd" d="M7.97814 6.27576C7.50308 5.88357 6.79868 5.90971 6.3542 6.3542C5.88193 6.82646 5.88193 7.59215 6.3542 8.06441L10.7898 12.5L6.3542 16.9356C5.88193 17.4079 5.88193 18.1735 6.3542 18.6458C6.79868 19.0903 7.50308 19.1164 7.97814 18.7242L8.06441 18.6458L12.5 14.2102L16.9356 18.6458L17.0219 18.7242C17.4969 19.1164 18.2013 19.0903 18.6458 18.6458C19.1181 18.1735 19.1181 17.4079 18.6458 16.9356L14.2102 12.5L18.6458 8.06441C19.1181 7.59215 19.1181 6.82646 18.6458 6.3542C18.2013 5.90971 17.4969 5.88357 17.0219 6.27576L16.9356 6.3542L12.5 10.7898L8.06441 6.3542L7.97814 6.27576Z" fill="#fff"/>
                        </svg>
                    </BButton>
                    <BImg :src="url" alt="Image" style="width: 100%; aspect-ratio: 1 / 1; object-fit: cover; border-radius: 1rem;"/>
                </div>

                <!-- Image Preview From Form Field -->
                <div class="card p-2" v-for="(file, index) in selectedImages" :key="index" style="width: calc(50% - 0.5rem); aspect-ratio: 1 / 1; border-radius: 1.5rem; overflow: hidden;">
                    <BButton @click="deleteSelectedImage(index)" variant="dark" style="position: absolute; top: 1rem; right: 1rem; padding: 0; border-radius: 100%; width: 42px; height: 42px; background-color: #000000bd;" >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path fill-rule="evenodd" clip-rule="evenodd" d="M7.97814 6.27576C7.50308 5.88357 6.79868 5.90971 6.3542 6.3542C5.88193 6.82646 5.88193 7.59215 6.3542 8.06441L10.7898 12.5L6.3542 16.9356C5.88193 17.4079 5.88193 18.1735 6.3542 18.6458C6.79868 19.0903 7.50308 19.1164 7.97814 18.7242L8.06441 18.6458L12.5 14.2102L16.9356 18.6458L17.0219 18.7242C17.4969 19.1164 18.2013 19.0903 18.6458 18.6458C19.1181 18.1735 19.1181 17.4079 18.6458 16.9356L14.2102 12.5L18.6458 8.06441C19.1181 7.59215 19.1181 6.82646 18.6458 6.3542C18.2013 5.90971 17.4969 5.88357 17.0219 6.27576L16.9356 6.3542L12.5 10.7898L8.06441 6.3542L7.97814 6.27576Z" fill="#fff" />
                        </svg>
                    </BButton>
                    <img :src="createObjectURL(file)" alt="Preview" style="width: 100%; aspect-ratio: 1 / 1; object-fit: cover; border-radius: 1rem;" />
                </div>

                <!-- Image Preview From Camera -->
                <div class="card p-2" v-for="(imageData, index) in capturedImages" :key="index" style="width: calc(50% - 0.5rem); aspect-ratio: 1 / 1; border-radius: 1.5rem; overflow: hidden;">
                    <BButton @click="deleteCapturedImage(index)" variant="dark" style="position: absolute; top: 1rem; right: 1rem; padding: 0; border-radius: 100%; width: 42px; height: 42px; background-color: #000000bd;" >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path fill-rule="evenodd" clip-rule="evenodd" d="M7.97814 6.27576C7.50308 5.88357 6.79868 5.90971 6.3542 6.3542C5.88193 6.82646 5.88193 7.59215 6.3542 8.06441L10.7898 12.5L6.3542 16.9356C5.88193 17.4079 5.88193 18.1735 6.3542 18.6458C6.79868 19.0903 7.50308 19.1164 7.97814 18.7242L8.06441 18.6458L12.5 14.2102L16.9356 18.6458L17.0219 18.7242C17.4969 19.1164 18.2013 19.0903 18.6458 18.6458C19.1181 18.1735 19.1181 17.4079 18.6458 16.9356L14.2102 12.5L18.6458 8.06441C19.1181 7.59215 19.1181 6.82646 18.6458 6.3542C18.2013 5.90971 17.4969 5.88357 17.0219 6.27576L16.9356 6.3542L12.5 10.7898L8.06441 6.3542L7.97814 6.27576Z" fill="#fff" />
                        </svg>
                    </BButton>
                    <img :src="imageData" alt="Preview" style="width: 100%; aspect-ratio: 1 / 1; object-fit: cover; border-radius: 1rem;" />
                </div>

                <BModal v-model="showCameraModal" title="Ambil Gambar">
                    <camera 
                        @image-captured="handleCapturedImage"
                        @camera-error="handleCameraError"
                        v-if="showCameraModal" 
                    />
                </BModal>
                
                <!-- Tombol buka kamera -->
                <div class="d-flex flex-column justify-content-center" style="width: calc(50% - 0.5rem); aspect-ratio: 1 / 1; gap: 1rem;">
                    <input type="file" ref="fileInput" style="display: none;" multiple accept="image/*" @change="onFileChange" />
                    
                    <BButton class="d-flex justify-content-center" variant="outline-light" size="lg" style="height: 72px; border-radius: 32px; gap: 12px; align-items: center; color: #252528; font-weight: 600!important; border-color: #EEEEEF; padding: .5rem 1rem;" @click="triggerFileInput">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path fill-rule="evenodd" clip-rule="evenodd" d="M13.4145 4.2842C13.3457 3.56358 12.7387 3 12 3C11.2152 3 10.5789 3.63623 10.5789 4.42105V10.5789H4.42105L4.2842 10.5855C3.56358 10.6543 3 11.2613 3 12C3 12.7848 3.63623 13.4211 4.42105 13.4211H10.5789V19.5789L10.5855 19.7158C10.6543 20.4364 11.2613 21 12 21C12.7848 21 13.4211 20.3638 13.4211 19.5789V13.4211H19.5789L19.7158 13.4145C20.4364 13.3457 21 12.7387 21 12C21 11.2152 20.3638 10.5789 19.5789 10.5789H13.4211V4.42105L13.4145 4.2842Z" fill="#252528"/>
                        </svg>
                        Galeri
                    </BButton>
                    <BButton class="d-flex justify-content-center" variant="outline-light" size="lg" style="height: 72px; border-radius: 32px; gap: 12px; align-items: center; color: #252528; font-weight: 600!important; border-color: #EEEEEF; padding: .5rem 1rem;" @click="showCameraModal = true">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path fill-rule="evenodd" clip-rule="evenodd" d="M12 16.4444C9.99182 16.4444 8.36364 14.8524 8.36364 12.8889C8.36364 10.9253 9.99182 9.33333 12 9.33333C14.0082 9.33333 15.6364 10.9253 15.6364 12.8889C15.6364 14.8524 14.0082 16.4444 12 16.4444M21.7382 8.42222C21.6309 7.58133 20.8727 6.93156 19.9236 6.864C19.3155 6.82044 18.4755 6.776 17.3691 6.74044C17.3509 6.37156 17.3318 6.04533 17.3127 5.76622C17.2527 4.90133 16.5609 4.20622 15.6773 4.128C14.8927 4.05778 13.7227 4 12 4C10.2773 4 9.10818 4.05778 8.32273 4.128C7.43909 4.20622 6.74727 4.90133 6.68727 5.76622C6.66818 6.04533 6.64909 6.37156 6.63091 6.74044C5.52455 6.776 4.68455 6.82044 4.07636 6.864C3.12727 6.93156 2.36909 7.58133 2.26182 8.42222C2.13273 9.43733 2 11.04 2 13.3333C2 15.6267 2.13273 17.2293 2.26182 18.2436C2.36909 19.0853 3.12727 19.7351 4.07636 19.8027C5.42182 19.8996 7.82636 20 12 20C16.1736 20 18.5782 19.8996 19.9236 19.8027C20.8727 19.7351 21.6309 19.0853 21.7382 18.2436C21.8673 17.2293 22 15.6267 22 13.3333C22 11.04 21.8673 9.43733 21.7382 8.42222" fill="#58585B"/>
                        </svg>
                        Kamera
                    </BButton>
                </div>

            </div>
            <div class="p-4" style="position: fixed; bottom: 0; width: 100%; right: 0; border-top-left-radius: 1rem; border-top-right-radius: 1rem; background-color: white; z-index: 9999; box-shadow: 0px 6px 14px 0px rgba(0, 0, 0, 0.16), 0px 0px 4px 0px rgba(0, 0, 0, 0.10);">
                <div class="d-flex justify-content-between">
                    <BButton @click="closeAddFoto" size="lg" variant="link" class="omicron green" style="height: 48px; text-decoration: none; color: #00AB4E; border-radius: 6px;">Batalkan</BButton>
                    <BButton @click="uploadImage" size="lg" variant="success" class="omicron green" style="height: 48px; border-radius: 6px;">Simpan</BButton>
                </div>
            </div>

        </BOffcanvas>
        <div class="px-4 pt-3 pb-4" style="position: fixed; bottom: 0; width: 100%; right: 0; border-top-left-radius: 1rem; border-top-right-radius: 1rem; background-color: white; z-index: 999; box-shadow: 0px 6px 14px 0px rgba(0, 0, 0, 0.16), 0px 0px 4px 0px rgba(0, 0, 0, 0.10);">
            <div class="d-flex justify-content-between">
                <BButton @click="router.back()" size="lg" variant="link" class="omicron green" style="height: 48px; text-decoration: none; color: #00AB4E; border-radius: 6px;">Scan Ulang</BButton>
                <BButton disabled @click="uploadImage" size="lg" variant="success" class="omicron green" style="height: 48px; border-radius: 6px;">Selesai</BButton>
            </div>
        </div>
    </div>
</template>

<style>
    .accordion-custom .accordion-button::after {
        display: none;
    }

    .accordion-custom .accordion-item:last-of-type > .accordion-header .accordion-button.collapsed{
        border-radius: 32px;
    }

    .accordion-item {
        border-radius: 32px !important;
    }

    .accordion-item:last-of-type {
        border-radius: 32px !important;
    }

    .accordion-item:first-of-type {
        border-radius: 32px !important;
    }

    .accordion-item h2 .accordion-button:not(.collapsed),
    .accordion-item h2 .accordion-button.collapsed {
        background-color: transparent;

        color: #252528;
    }

    .accordion-item h2 .accordion-button:focus {
        box-shadow: none;
    }

    .accordion-item:not(:first-of-type) {
        border-top: 1px solid #dee2e6 !important;
    }

    .offcanvas.offcanvas-noheader .offcanvas-header{
        display: none;
    }

    .btn-lg {
        height: 72px;
        border-radius: 50%;
    }

    .sigma {
        font-size: 14px;
        font-weight: 600;
        line-height: 20px;
    }

    .omicron {
        font-size: 1rem !important;
        font-weight: 800 !important;
        line-height: 1.5rem !important;
    }

    .kappa {
        font-size: 1.5rem;
        font-weight: 800;
        line-height: 34px;
    }

    label {
        font-size: 14px;
        font-weight: 600;
        line-height: 20px;

        margin-bottom: 4px;
    }

    .green {
        color: #00AB4E;
    }
</style>