const express = require("express");
const cors = require("cors");
const Database = require("./db");
const ini = require("ini");
const fs = require("fs");
const path = require("path");

const app = express();

// IZINKAN AKSES DARI HP/PWA
app.use(cors({
  origin: "*",
  methods: ["GET", "POST"]
}));

app.use(express.json());

// Load Config (sama seperti sebelumnya)
const configPath = path.resolve(__dirname, "..", "config.ini");
const config = ini.parse(fs.readFileSync(configPath, "utf-8")).database;
const db = new Database(config);

app.get("/api/logs", (req, res) => {
  db.query("SELECT * FROM timbangan_logs ORDER BY id DESC LIMIT 50", [], (err, results) => {
    if (err) return res.status(500).json({ status: "error", message: err.message });
    res.json({ status: "success", data: results });
  });
});

app.post("/api/weight", (req, res) => {
  const { product, client, weight, unit } = req.body;
  const sql = "INSERT INTO timbangan_logs (product_name, client_name, gross_weight, unit_used) VALUES (?, ?, ?, ?)";
  db.query(sql, [product, client, weight, unit], (err) => {
    if (err) return res.status(500).json({ status: "error", message: err.message });
    res.json({ status: "success" });
  });
});

app.listen(5000, "0.0.0.0", () => {
  console.log("🚀 Server running on http://0.0.0.0:5000");
});