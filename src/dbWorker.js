import sqlite3InitModule from '@sqlite.org/sqlite-wasm';

const log = console.log;
const error = console.error;

const start = async () => {
  try {
    const sqlite3 = await sqlite3InitModule({
      print: log,
      printErr: error,
    });

    if ('opfs' in sqlite3) {
      // Membuka database di OPFS (Penyimpanan Privat Browser)
      // File ini bernama 'timbangan_lokal.db' dan hanya ada di device ini
      const db = new sqlite3.oo1.OpfsDb('/timbangan_lokal.db');
      
      // Buat tabel jika belum ada
      db.exec(`
        CREATE TABLE IF NOT EXISTS timbangan_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          product_name TEXT,
          weight REAL,
          unit TEXT
        );
      `);

      log("SQLite WASM + OPFS Ready!");

      // Listener untuk pesan dari React (Frontend)
      onmessage = function (e) {
        const { type, data } = e.data;
        
        if (type === 'INSERT_LOG') {
          db.exec({
            sql: 'INSERT INTO timbangan_logs (product_name, weight, unit) VALUES (?, ?, ?)',
            bind: [data.product, data.weight, data.unit]
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
    error(err.name, err.message);
  }
};

start();