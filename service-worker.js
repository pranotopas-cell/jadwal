// service-worker.js

// Konfigurasi REST Firebase Firestore berdasarkan config Anda
const FIREBASE_PROJECT_ID = "ikaen-tracking";

self.addEventListener('install', (event) => {
    self.skipWaiting();
    console.log('Service Worker Installed.');
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
    console.log('Service Worker Activated.');
});

// Mendengarkan pesan dari aplikasi utama (HTML)
self.addEventListener('message', (event) => {
    const data = event.data;
    
    if (data.action === 'START_TRACKING') {
        console.log('Background Tracking Dimulai untuk:', data.sopir);
        // Jalankan interval pelacakan di background (FallBack jika Geolocation Watch tertidur)
        startBackgroundInterval(data);
    } else if (data.action === 'STOP_TRACKING') {
        console.log('Background Tracking Dihentikan.');
        if (self.trackingInterval) {
            clearInterval(self.trackingInterval);
        }
    }
});

function startBackgroundInterval(driverData) {
    if (self.trackingInterval) clearInterval(self.trackingInterval);

    // Kirim data secara berkala setiap 15 detik saat di background
    self.trackingInterval = setInterval(() => {
        // Karena SW tidak memiliki akses langsung ke navigator.geolocation secara bebas di beberapa device,
        // kita mengandalkan event berkala untuk memicu sinkronisasi atau meminta data posisi dari client yang aktif.
        self.clients.matchAll().then((clients) => {
            clients.forEach((client) => {
                // Meminta client/halaman web untuk mengirimkan lokasi terbaru mereka
                client.postMessage({ action: 'REQUEST_LOCATION' });
            });
        });
    }, 15000);
}
