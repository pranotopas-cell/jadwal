// service-worker.js

const FIREBASE_PROJECT_ID = "ikaen-tracking";
let trackingInterval = null;
let lastLat = null;
let lastLon = null;
let currentDriver = null;

self.addEventListener('install', (event) => { self.skipWaiting(); });
self.addEventListener('activate', (event) => { event.waitUntil(self.clients.claim()); });

// Mendengarkan pesan dari aplikasi utama
self.addEventListener('message', (event) => {
    const data = event.data;

    // A. Terima setoran lokasi terbaru dari index.html saat foreground
    if (data.action === 'UPDATE_LATEST_COORDINATE') {
        lastLat = data.latitude;
        lastLon = data.longitude;
    }

    // B. Jalankan perintah tracking
    if (data.action === 'START_TRACKING') {
        currentDriver = data.sopir; // Contoh: "NOTO"
        console.log('Background Tracking Aktif untuk:', currentDriver);

        if (!trackingInterval) {
            trackingInterval = setInterval(() => {
                // HANYA KIRIM JIKA KOORDINAT SUDAH TERSEDIA
                if (lastLat && lastLon && currentDriver) {
                    updateFirestoreViaREST(currentDriver, lastLat, lastLon);
                }
            }, 15000); // Eksekusi kirim ke Firebase tiap 15 detik
        }
    } 
    
    // C. Hentikan tracking
    else if (data.action === 'STOP_TRACKING') {
        if (trackingInterval) {
            clearInterval(trackingInterval);
            trackingInterval = null;
        }
        console.log('Background Tracking Dimatikan.');
    }
});

// Fungsi menembak langsung ke Firestore tanpa bergantung pada halaman web
function updateFirestoreViaREST(sopir, lat, lon) {
    // Sesuaikan lokasi dokumen "NOTO" di dalam collection "tracking_unit"
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/tracking_unit/${sopir}?updateMask.fieldPaths=lat&updateMask.fieldPaths=lon&updateMask.fieldPaths=last_update`;

    const payload = {
        fields: {
            lat: { doubleValue: lat },
            lon: { doubleValue: lon },
            last_update: { stringValue: new Date().toISOString() }
        }
    };

    fetch(url, {
        method: 'PATCH', // Menggunakan PATCH untuk memperbarui field tertentu saja
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(res => console.log(`SW: Berhasil update Firestore untuk ${sopir}`))
    .catch(err => console.error('SW REST API Error:', err));
}
