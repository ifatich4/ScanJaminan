<script setup>
    import {
        ref,
        reactive,
        computed
    } from "vue";
    import {
        getFirestore,
        doc,
        collection,
        getDocs,
        getDoc,
    } from "firebase/firestore";
    import {
        QrcodeStream
    } from "vue3-qrcode-reader";
    import {
        BOffcanvas,
        BModal,
        BListGroup,
        BSpinner,
        BCard
    } from "bootstrap-vue-next";
    import { createClient } from "@supabase/supabase-js";
    import { useRouter } from "vue-router";

    // Inisiasi Router
    const router = useRouter();


     // Inisialisasi Supabase Client
    const supabaseUrl = "https://obqojequpinlinynnisz.supabase.co";
    const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9icW9qZXF1cGlubGlueW5uaXN6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczMjA3ODA0MSwiZXhwIjoyMDQ3NjU0MDQxfQ.kcoCsvVgnYwIvRKg8vbSxAqMA4_QjOHuTtOF954-3EY"; 

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Firebase setup
    const db = getFirestore();

    // State
    const sbgId = ref(null);
    const scanning = ref(true);
    const show = ref(false); // Main Offcanvas
    const showDetail = ref(false); // Detail Offcanvas
    const isLoading = ref(false);
    const userDetailCredits = reactive([]);
    const imageUrls = ref([]);
    const loadingImages = ref(true);  // Add loading state if needed
    const selectedDetail = ref(null);

    // Fungsi yang dijalankan saat berhasil memindai QR code
    const onDecode = async (decodedString) => {
        sbgId.value = decodedString;
        scanning.value = false;
        await fetchDetailCreditData(decodedString);
        show.value = true;
    };

    // Ambil data DetailCredit berdasarkan sbg_id
    const fetchDetailCreditData = async (sbg_id) => {
        try {
            showLoading();
            userDetailCredits.splice(0, userDetailCredits.length); // Reset list

            // Cari dokumen `sbgIds` untuk mendapatkan UID
            const sbgDocRef = doc(db, "sbgIds", sbg_id);
            const sbgDocSnap = await getDoc(sbgDocRef);
            if (!sbgDocSnap.exists()) {
                alert("sbg_id tidak ditemukan.");
                return;
            }

            const {
                uid
            } = sbgDocSnap.data();

            // Ambil koleksi DetailCredit
            const detailCreditColRef = collection(db, "users", uid, "DetailCredit");
            const detailCreditSnap = await getDocs(detailCreditColRef);

            if (detailCreditSnap.empty) {
                alert("Tidak ada DetailCredit untuk user ini.");
                return;
            }

            // Iterasi melalui dokumen DetailCredit
            for (const detailCreditDoc of detailCreditSnap.docs) {
                const detailCreditId = detailCreditDoc.id;

                // Ambil data dari koleksi `Credit`
                const userCredentialsColRef = collection(db, "users");
                const userCredentialsSnap = await getDocs(userCredentialsColRef);
                const userCredentialsData = userCredentialsSnap.docs.map((userCredentialsDoc) => ({
                    id: userCredentialsDoc.id,
                    ...userCredentialsDoc.data(),
                }));

                // Fetch subcollections
                const creditColRef = collection(db, "users", uid, "DetailCredit", detailCreditId, "Credit");
                const creditSnap = await getDocs(creditColRef);
                const creditData = creditSnap.docs.map((creditDoc) => ({
                    id: creditDoc.id,
                    ...creditDoc.data(),
                }));

                const detailJaminanColRef = collection(db, "users", uid, "DetailCredit", detailCreditId, "DetailJaminan");
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

                // const imageUrls = await Promise.all(
                //     userImageData.map(async (imageDoc) => {
                //         const imageNames = imageDoc.image;
                //         if (Array.isArray(imageNames) && imageNames.length > 0) {
                //             return Promise.all(imageNames.map((name) => getSupabaseImageUrl(name)));
                //         }
                //         return [];
                //     })
                // );

                let imageUrls = [];
                const imageUrlsArray = await Promise.all(
                    userImageData.map(async (imageDoc) => {
                        const imageNames = imageDoc.image;
                        if (Array.isArray(imageNames) && imageNames.length > 0) {
                            return Promise.all(imageNames.map((name) => getSupabaseImageUrl(name)));
                        }
                        return [];
                    })
                );

                if (imageUrlsArray && imageUrlsArray.length) {
                    imageUrls = imageUrlsArray.flat();
                } else {
                    show.value = true;
                }

                userDetailCredits.push({
                    id: detailCreditId,
                    credit: creditData,
                    userCredentials: userCredentialsData,
                    detailJaminan: detailJaminanData,
                    userImages: userImageData,
                    imageUrls: imageUrls,
                });
            }
        } catch (error) {
            console.error(`Error fetching DetailCredit data: ${error.message}`);
        } finally {
            hideLoading();
            show.value = true;
        }
    };

    async function getSupabaseImageUrl(imageName) {
        try {
            const { data, error } = await supabase.storage.from("ScanJaminan").download(imageName);
            if (error) {
                return null;
            }
            return URL.createObjectURL(data);
        } catch (error) {
            console.error(`Error fetching image URL: ${error.message}`);
            return null;
        }
    }

    const showLoading = () => {
        isLoading.value = true;
    };
    const hideLoading = () => {
        isLoading.value = false;
    };
    const handleError = (message) => {
        console.error(message);
    };
    const openDetail = (detail) => {
        router.push({
            name: "DetailPage",
            params: { id: detail.id },
        });
    };
    const currentDate = computed(() => {
        const today = new Date();
        const day = String(today.getDate()).padStart(2, '0');
        const month = String(today.getMonth() + 1).padStart(2, '0'); // January is 0!
        const year = today.getFullYear();
        return `${day}/${month}/${year}`;
    });
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
</script>

<template>
    <div>
        <qrcode-stream
            class="qrcode-stream"
            @decode="onDecode"
            style="width: 100vw; height: 100vh;"
            v-if="!show"
        ></qrcode-stream>

        <BModal v-model="isLoading" centered title="Loading">
            <BSpinner />
        </BModal>

        <!-- Main Offcanvas -->
        <BOffcanvas v-model="show" placement="bottom" class="offcanvas-noheader" style="height: fit-content; border-top-left-radius: 1rem; border-top-right-radius: 1rem;">

            <div class="d-flex justify-content-center" style="flex-direction: column; align-items: center;">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="4" viewBox="0 0 32 4" fill="none">
                    <rect x="0.041687" width="31.25" height="4" rx="2" fill="#EEEEEF"/>
                </svg>
                <div class="card my-3 border-0 w-100" style="text-align: start;">
                    <div class="omicron mb-2">List Barang Jaminan</div>
                    <div class="sigma">{{ currentDate }}</div>
                </div>
            </div>
            
            <div v-if="userDetailCredits.length === 0">
                <p>Data tidak ditemukan.</p>
            </div>

            <BListGroup v-else>
                <BCard
                    v-for="detailCredit in userDetailCredits"
                    :key="detailCredit.id"
                    class="mb-3 border-0"
                    @click="openDetail(detailCredit)"
                    style="cursor: pointer; border-radius: 1.5rem; box-shadow: 0px 6px 14px 0px rgba(0, 0, 0, 0.16), 0px 0px 4px 0px rgba(0, 0, 0, 0.10);"
                >
                    <div style="display: flex; align-items: center; cursor: pointer; width: 100%;">
                        <div v-for="(url, index) in detailCredit.imageUrls" :key="index">
                            <BImg v-if="index === 0" :src="url" alt="Image" fluid style="width: 48px; height: 48px; border-radius: .5rem; object-fit: cover; margin-right: .5rem;"/>
                        </div>
                        <div v-if="detailCredit.userCredentials && detailCredit.userCredentials.length > 0" class="d-flex flex-column">
                            <div class="sigma">Nomor Kredit</div>
                            <div class="omicron">{{ detailCredit.userCredentials[0].NomorKredit }}</div>
                        </div>
                        <div v-if="detailCredit.userCredentials && detailCredit.userCredentials.length > 0" style="position: absolute; right: 1rem; top: 1rem">
                            <div class="sigma">{{ formatDate(detailCredit.userCredentials[0].TanggalPinjaman) }}</div>
                        </div>
                    </div>


                    <div class="card mt-3" style="border-radius: 12px;">
                        <div class="card-body d-flex flex-column" style="gap: 4px;">
                            <div class="sigma" v-for="detailJaminan in detailCredit.detailJaminan" :key="detailJaminan.id"> 
                                Merek  : {{ detailJaminan.Merek }}
                            </div>
                            <div class="sigma" v-for="detailJaminan in detailCredit.detailJaminan" :key="detailJaminan.id"> 
                                Model  : {{ detailJaminan.Model }}
                            </div>
                            <div class="sigma" v-for="detailJaminan in detailCredit.detailJaminan" :key="detailJaminan.id"> 
                                Tahun  : {{ detailJaminan.Tahun }}
                            </div>
                            <div class="sigma" v-for="detailJaminan in detailCredit.detailJaminan" :key="detailJaminan.id"> 
                                Warna : {{ detailJaminan.Warna }}
                            </div>
                        </div>
                    </div>
                    
                </BCard>
            </BListGroup>
        </BOffcanvas>
    </div>
</template>

<style scoped>
    .qrcode-stream {
        position: absolute;
        top: 0;
        left: 0;
        z-index: 1000;
    }
</style>