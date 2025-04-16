# 📊 Sentiment Analysis Web App

Aplikasi ini terdiri dari dua bagian utama: **Backend** (Node.js) dan **Frontend** (Web App).  
Backend digunakan untuk pelatihan dan prediksi data sentimen, sedangkan frontend menyediakan antarmuka pengguna.

---

## 🚀 Cara Menjalankan Aplikasi

### 🔧 1. Jalankan Backend

Langkah-langkah:

```bash
# Install semua dependency backend
npm install
# Jalankan server secara lokal
node server.js
# (Optional) Jalankan dengan nodemon (daemon)
nodemon server.js

Endpoint | Method | Deskripsi
/skripsi/utils/trainDataSet | GET | Melatih dataset sentimen
/skripsi/utils/showScore | GET | Melihat skor hasil training
/skripsi/utils/sentimentAnalyst | POST | Prediksi sentimen dari komentar

contoh body :
{
  "komentar": "Pelayanan sangat baik dan cepat"
}

```
running web app :
# Install semua dependency frontend
npm install
# Jalankan aplikasi web
npm run dev

