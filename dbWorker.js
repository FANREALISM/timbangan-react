import sqlite3InitModule from '@sqlite.org/sqlite-wasm';

const start = async () => {
  try {
    const sqlite3 = await sqlite3InitModule({
      print: console.log,
      printErr: console.error,
      // PENTING: Arahkan ke CDN jika Vite gagal melacak file .wasm lokal
      locateFile: (file) => {
        if (file.endsWith('.wasm')) {
          return `https://cdn.jsdelivr.net/npm/@sqlite.org/sqlite-wasm@3.44.2/sqlite-wasm/jswasm/${file}`;
        }
        return file;
      }
    });

    if ('opfs' in sqlite3) {
      const db = new sqlite3.oo1.OpfsDb('/timbangan_lokal.db');
      
      // Pastikan tabel dibuat dengan benar
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

      onmessage = function (e) {
        const { type, data } = e.data;
        
        if (type === 'INSERT_LOG') {
          db.exec({
            sql: `INSERT INTO timbangan_logs (product_name, client_name, gross_weight, unit_used) 
                  VALUES (?, ?, ?, ?)`,
            bind: [data.product, data.client, data.weight, data.unit]
          });
          // Kirim balik konfirmasi sukses
          postMessage({ type: 'SUCCESS_INSERT' });
        }

        if (type === 'GET_LOGS') {
          const rows = [];
          db.exec({
            sql: 'SELECT * FROM timbangan_logs ORDER BY id DESC LIMIT 50',
            rowMode: 'object',
            callback: (row) => rows.push(row)
          });
          // Kirim data ke App.jsx
          postMessage({ type: 'LOGS_DATA', data: rows });
        }
      };
      
      console.log("✅ SQLite WASM Worker Ready!");
    }
  } catch (err) {
    console.error("❌ SQLite Worker Error:", err);
  }
};

start();