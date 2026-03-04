const express = require("express");
const cors = require("cors");
const ini = require("ini");
const fs = require("fs");
const path = require("path");
const Database = require("./db"); // Pastikan file db.js Anda juga kompatibel

const app = express();

app.use(cors({ origin: "*", methods: ["GET", "POST"] }));
app.use(express.json());

// Fungsi Helper untuk memuat database hanya saat dibutuhkan (Lazy Loading)
let db;
function getDb() {
  if (!db) {
    try {
      // Gunakan path absolut yang aman untuk Vercel
      const configPath = path.join(process.cwd(), "config.ini");
      const config = ini.parse(fs.readFileSync(configPath, "utf-8")).database;
      db = new Database(config);
    } catch (err) {
      console.error("Gagal memuat config.ini:", err.message);
      return null;
    }
  }
  return db;
}

app.get("/api/logs", (req, res) => {
  const connection = getDb();
  if (!connection) return res.status(500).json({ status: "error", message: "Database config missing" });

  connection.query("SELECT * FROM timbangan_logs ORDER BY id DESC LIMIT 50", [], (err, results) => {
    if (err) return res.status(500).json({ status: "error", message: err.message });
    res.json({ status: "success", data: results });
  });
});

// Penting untuk Vercel: Export app
module.exports = app;