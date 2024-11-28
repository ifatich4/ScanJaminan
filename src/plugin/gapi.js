const loadGapiClient = () => {
    return new Promise((resolve, reject) => {
        // Menunggu hingga script GAPI dimuat
        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
        script.onload = () => {
            console.log('GAPI script loaded successfully.');

            // Memastikan gapi sudah ada dan siap untuk digunakan
            if (typeof window.gapi !== 'undefined') {
                console.log('GAPI is available, initializing...');

                gapi.load('client:auth2', async () => {
                    try {
                        console.log('Initializing GAPI client...');
                        await gapi.client.init({
                            apiKey: 'AIzaSyArFaa7POQlqPe_HMkLvOOxtRPGlMTRNck', // Sesuaikan dengan API key Anda
                            clientId: '522198786752-qq9qqmt2so0q96r0065aajupm68e51id.apps.googleusercontent.com', // Sesuaikan dengan client_id Anda
                            discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
                            scope: 'https://www.googleapis.com/auth/drive.readonly', // Sesuaikan dengan scope yang dibutuhkan
                        });

                        const authInstance = gapi.auth2.getAuthInstance();
                        if (!authInstance.isSignedIn.get()) {
                            await authInstance.signIn(); // Proses sign-in pengguna jika belum signed in
                        }

                        console.log('GAPI client initialized and user signed in.');
                        resolve(gapi); // Mengembalikan objek gapi
                    } catch (error) {
                        console.error('Error initializing GAPI client:', error);
                        reject(error);
                    }
                });
            } else {
                reject(new Error('GAPI is not available.'));
            }
        };

        script.onerror = () => {
            reject(new Error('Error loading GAPI script.'));
        };

        document.head.appendChild(script);

        // Timeout jika script GAPI gagal dimuat dalam 10 detik
        setTimeout(() => {
            reject(new Error('GAPI script did not load in time.'));
        }, 10000);
    });
};

export default loadGapiClient;
