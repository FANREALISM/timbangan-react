# ⚖️ Timbangan React

Aplikasi timbangan digital berbasis web menggunakan **React + Vite**. Mendukung koneksi alat timbangan via **USB/Bluetooth (Web Serial API)** maupun **WiFi (WebSocket)**, dengan penyimpanan data ke **MySQL** atau **SQLite**.

---

## 🗂️ Struktur Proyek

```
timbangan-react/
├── src/
│   ├── App.jsx                   # Root komponen (state & logic)
│   ├── App.css                   # Global styles
│   ├── main.jsx                  # Entry point React
│   ├── components/
│   │   ├── ScalesDisplay.jsx     # Tampilan LCD timbangan
│   │   ├── ConnectionPanel.jsx   # Panel koneksi alat (USB / WiFi)
│   │   ├── WeightForm.jsx        # Form input barang & customer
│   │   └── WeightHistory.jsx     # Tabel riwayat timbangan
│   └── hooks/
│       ├── useSerialScale.js     # Hook koneksi USB / Bluetooth
│       └── useWebsocketScale.js  # Hook koneksi WiFi / WebSocket
├── config.ini                    # Konfigurasi database & server
├── config_reader.py              # Pembaca config untuk Python backend
├── CONFIG_MANUAL.md              # Manual lengkap penggunaan config.ini
└── package.json
```

---

## 🚀 Menjalankan Aplikasi

### 1. Install dependencies

```bash
npm install
```

### 2. Jalankan dev server

```bash
npm run dev
```

Buka browser di `http://localhost:5173`

### 3. Build untuk produksi

```bash
npm run build
```

---

## ⚙️ Konfigurasi (`config.ini`)

File `config.ini` digunakan untuk mengatur koneksi database dan server backend Python.

### Pilih jenis database

```ini
[database]
db_type = mysql    # atau: sqlite
```

### MySQL (XAMPP / server lokal)

```ini
mysql_host     = localhost
mysql_port     = 3306
mysql_user     = root
mysql_password =
mysql_database = db_timbangan
```

Ganti `mysql_host` ke IP (misal `192.168.1.50`) jika MySQL ada di komputer lain.

### SQLite (tanpa server)

```ini
db_type     = sqlite
sqlite_path = timbangan.db
```

### Server Python

```ini
[server]
host  = localhost   # gunakan 0.0.0.0 agar bisa diakses dari jaringan
port  = 5000
debug = true
```

> 📖 Lihat **[CONFIG_MANUAL.md](./CONFIG_MANUAL.md)** untuk panduan lengkap.

---

## 🔌 Koneksi Alat Timbangan

| Mode                | Cara                                     | Kebutuhan                          |
| ------------------- | ---------------------------------------- | ---------------------------------- |
| **USB / Bluetooth** | Klik tombol _USB / Bluetooth_            | Browser Chrome/Edge, driver alat   |
| **WiFi**            | Masukkan IP alat → klik _Hubungkan WiFi_ | Alat & PC dalam jaringan yang sama |

---

## 🐍 Backend Python

Install dependency Python:

```bash
pip install mysql-connector-python
```

Test koneksi database:

```bash
python config_reader.py
```

---

## 🛠️ Tech Stack

- **React 18** + **Vite 4**
- **Lucide React** — ikon UI
- **Web Serial API** — koneksi USB/Bluetooth
- **WebSocket** — koneksi WiFi
- **Python** + `configparser` — backend & konfigurasi
- **MySQL** / **SQLite** — penyimpanan data
