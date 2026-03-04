import sqlite3InitModule from '@sqlite.org/sqlite-wasm';

const start = async () => {
  try {
    const sqlite3 = await sqlite3InitModule();

    if ('opfs' in sqlite3) {
      // Membuka database di penyimpanan privat browser (OPFS)
      const db = new sqlite3.oo1.OpfsDb('/timbangan_lokal.db');
      
      // Inisialisasi tabel sesuai skema db.cjs Anda
      db.exec(`
        CREATE TABLE IF NOT EXISTS timbangan_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          product_name TEXT NOT NULL,
          client_name TEXT,
          gross_weight REAL,
          unit_used TEXT
        );
      `);

      // Handler Komunikasi dengan App.jsx
      onmessage = function (e) {
        const { type, data } = e.data;
        
        // Simpan Data Timbangan
        if (type === 'INSERT_LOG') {
          db.exec({
            sql: `INSERT INTO timbangan_logs (product_name, client_name, gross_weight, unit_used) 
                  VALUES (?, ?, ?, ?)`,
            bind: [data.product, data.client, data.weight, data.unit]
          });
          postMessage({ type: 'SUCCESS_INSERT' });
        }

        // Ambil Riwayat Timbangan
        if (type === 'GET_LOGS') {
          const rows = [];
          db.exec({
            sql: 'SELECT * FROM timbangan_logs ORDER BY id DESC LIMIT 50',
            rowMode: 'object',
            callback: (row) => rows.push(row)
          });
          postMessage({ type: 'LOGS_DATA', data: rows });
        }
      };

      console.log("SQLite WASM OPFS initialized successfully");
    }
  } catch (err) {
    console.error("SQLite WASM Error:", err.message);
  }
};

start();