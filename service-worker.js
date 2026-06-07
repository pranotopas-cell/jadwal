// service-worker.js

const FIREBASE_PROJECT_ID = "ikaen-tracking";
let lastKnownLocation = null;
let trackingInterval = null;
let driverInfo = null;

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
    
    // 1. Setiap kali halaman utama dapat koordinat baru (saat background/foreground), simpan di SW
    if (data.action === 'UPDATE_LOCATION') {
        lastKnownLocation = {
            lat: data.latitude,
            lon: data.longitude
        };
        driverInfo = data.driverData; // Menyimpan data sopir, nopol, qty, dll.
    }

    if (data.action === 'START_TRACKING') {
        console.log('Background Tracking Dimulai untuk:', data.sopir);
        driverInfo = data;
        
        if (!trackingInterval) {
            trackingInterval = setInterval(() => {
                // Kirim koordinat terakhir yang tersimpan langsung ke Firestore dari SW (Tanpa nanya client lagi)
                if (lastKnownLocation && driverInfo) {
                    kirimKeFirestoreREST(driverInfo, lastKnownLocation);
                }
            }, 15000); // Eksekusi tiap 15 detik
        }
    } else if (data.action === 'STOP_TRACKING') {
        console.log('Background Tracking Dihentikan.');
        if (trackingInterval) {
            clearInterval(trackingInterval);
            trackingInterval = null;
        }
    }
});

// Fungsi menembak langsung ke REST API Firestore tanpa Firebase SDK standar
function kirimKeFirestoreREST(driver, lokasi) {
    // Sesuaikan dengan nama collection database Firestore Abang (misal: data_pengiriman atau tracking_sopir)
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/tracking_sopir/${driver.sopir}`;

    const payload = {
        fields: {
            sopir: { stringValue: driver.sopir },
            nopol: { stringValue: driver.nopol || "" },
            latitude: { doubleValue: lokasi.lat },
            longitude: { doubleValue: lokasi.lon },
            last_update: { stringValue: new Date().toISOString() }
        }
    };

    fetch(url, {
        method: 'PATCH', // Pakai PATCH agar meng-update atau membuat baru jika belum ada
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(res => console.log('SW Berhasil Update Lokasi ke Firestore via REST API'))
    .catch(err => console.error('SW Gagal kirim REST API:', err));
}
