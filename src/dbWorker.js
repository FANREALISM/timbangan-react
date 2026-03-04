import sqlite3InitModule from '@sqlite.org/sqlite-wasm';

const start = async () => {
  try {
    const sqlite3 = await sqlite3InitModule({
      print: console.log,
      printErr: console.error,
      locateFile: (file) => {
        // Menggunakan CDN resmi agar binary WASM tidak korup saat build
        return `https://cdn.jsdelivr.net/npm/@sqlite.org/sqlite-wasm@3.44.2/sqlite-wasm/jswasm/${file}`;
      }
    });

    if ('opfs' in sqlite3) {
      const db = new sqlite3.oo1.OpfsDb('/timbangan_v5.db');
      
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

      postMessage({ type: 'DB_READY' });

      onmessage = function (e) {
        const { type, data } = e.data;
        if (type === 'INSERT_LOG') {
          db.exec({
            sql: `INSERT INTO timbangan_logs (product_name, client_name, gross_weight, unit_used) VALUES (?, ?, ?, ?)`,
            bind: [data.product, data.client, data.weight, data.unit]
          });
          postMessage({ type: 'SUCCESS_INSERT' });
        }
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
    }
  } catch (err) {
    console.error("SQLite Worker Error:", err);
  }
};

start();