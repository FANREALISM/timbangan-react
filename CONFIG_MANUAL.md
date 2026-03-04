# Manual Penggunaan `config.ini`

File `config.ini` digunakan untuk mengatur koneksi **database** dan **server** tanpa harus mengubah kode Python.

---

## 📁 Lokasi File

```
timbangan-react/
├── config.ini        ← file konfigurasi
└── config_reader.py  ← pembaca konfigurasi (jangan diubah)
```

---

## 🗄️ Section `[database]`

### Memilih Jenis Database

```ini
[database]
db_type = mysql   # gunakan MySQL
# db_type = sqlite  # atau gunakan SQLite (hapus tanda #)
```

> Hanya satu yang aktif. Ubah nilai `db_type` ke `mysql` atau `sqlite`.

---

### Jika Menggunakan MySQL

```ini
mysql_host     = localhost       # atau IP server, contoh: 192.168.1.50
mysql_port     = 3306            # port default MySQL
mysql_user     = root            # username MySQL
mysql_password =                 # password (kosongkan jika tidak ada)
mysql_database = db_timbangan   # nama database yang dipakai
```

#### Skenario umum:

| Situasi                      | `mysql_host`                |
| ---------------------------- | --------------------------- |
| MySQL di komputer yang sama  | `localhost`                 |
| MySQL di komputer lain (LAN) | `192.168.1.xxx` (IP server) |
| MySQL di VPS/cloud           | IP publik server            |

---

### Jika Menggunakan SQLite

```ini
db_type     = sqlite
sqlite_path = timbangan.db   # nama/path file database SQLite
```

SQLite tidak butuh server — data disimpan langsung dalam satu file `.db`.

| Path                   | Keterangan                                    |
| ---------------------- | --------------------------------------------- |
| `timbangan.db`         | File dibuat di folder yang sama dengan script |
| `C:/data/timbangan.db` | Path absolut (lokasi bebas)                   |

---

## 🌐 Section `[server]`

```ini
[server]
host  = localhost   # host server Python (localhost atau 0.0.0.0)
port  = 5000        # port yang digunakan
debug = true        # true = tampilkan error detail, false = mode produksi
```

| `host`      | Keterangan                                     |
| ----------- | ---------------------------------------------- |
| `localhost` | Hanya bisa diakses dari komputer ini           |
| `0.0.0.0`   | Bisa diakses dari komputer/HP lain di jaringan |

---

## ✅ Contoh Konfigurasi

### Contoh 1 — MySQL di komputer sendiri (XAMPP)

```ini
[database]
db_type        = mysql
mysql_host     = localhost
mysql_port     = 3306
mysql_user     = root
mysql_password =
mysql_database = db_timbangan

[server]
host  = localhost
port  = 5000
debug = true
```

### Contoh 2 — MySQL di komputer lain (jaringan LAN)

```ini
[database]
db_type        = mysql
mysql_host     = 192.168.1.50
mysql_port     = 3306
mysql_user     = admin
mysql_password = password123
mysql_database = db_timbangan

[server]
host  = 0.0.0.0
port  = 5000
debug = false
```

### Contoh 3 — SQLite (tanpa server database)

```ini
[database]
db_type     = sqlite
sqlite_path = timbangan.db

[server]
host  = localhost
port  = 5000
debug = true
```

---

## 🔧 Cara Menguji Konfigurasi

Jalankan perintah berikut di terminal:

```bash
python config_reader.py
```

Output yang benar:

```
=== Konfigurasi Database ===
Tipe DB  : mysql
MySQL    : {'host': 'localhost', ...}

=== Test Koneksi ===
[DB] Terhubung ke MySQL: localhost:3306 / db_timbangan
Koneksi berhasil!
```

Jika muncul **"Koneksi gagal"**, periksa:

- Apakah XAMPP/MySQL sudah dijalankan?
- Apakah nama database sudah benar?
- Apakah username/password sesuai?

---

## ⚠️ Catatan Penting

- Baris diawali `#` adalah **komentar** — tidak dibaca program, hanya keterangan.
- Jangan beri tanda kutip (`"`) pada nilai, tulis langsung: `mysql_host = localhost`
- Setelah mengubah `config.ini`, tidak perlu restart — perubahan terbaca saat program Python dijalankan ulang.
- Untuk MySQL, pastikan sudah install: `pip install mysql-connector-python`
