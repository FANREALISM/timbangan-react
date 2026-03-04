import sqlite3InitModule from "@sqlite.org/sqlite-wasm";

const start = async () => {
  try {
    console.log("Worker: Starting initialization...");
    const sqlite3 = await sqlite3InitModule({
      print: console.log,
      printErr: console.error,
    });

    let db;
    let isFallback = false;

    console.log("Worker: Checking OPFS availability...");
    if ("opfs" in sqlite3) {
      try {
        db = new sqlite3.oo1.OpfsDb("/timbangan_v5.db");
        console.log("Worker: Persistent Database (OPFS) initialized.");
      } catch (err) {
        console.error(
          "Worker: Failed to open OPFS DB, falling back to memory:",
          err,
        );
        db = new sqlite3.oo1.DB();
        isFallback = true;
      }
    } else {
      console.warn(
        "Worker: OPFS not available, using In-Memory database (NOT PERSISTENT)",
      );
      db = new sqlite3.oo1.DB();
      isFallback = true;
    }

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

    postMessage({
      type: "DB_READY",
      data: { isFallback },
    });

    onmessage = function (e) {
      const { type, data } = e.data;
      if (type === "INSERT_LOG") {
        try {
          db.exec({
            sql: `INSERT INTO timbangan_logs (product_name, client_name, gross_weight, unit_used) VALUES (?, ?, ?, ?)`,
            bind: [data.product, data.client, data.weight, data.unit],
          });
          postMessage({ type: "SUCCESS_INSERT" });
        } catch (err) {
          postMessage({ type: "ERROR", data: "Insert Failed: " + err.message });
        }
      }
      if (type === "GET_LOGS") {
        try {
          const rows = [];
          db.exec({
            sql: "SELECT * FROM timbangan_logs ORDER BY id DESC LIMIT 50",
            rowMode: "object",
            callback: (row) => rows.push(row),
          });
          postMessage({ type: "LOGS_DATA", data: rows });
        } catch (err) {
          postMessage({ type: "ERROR", data: "Query Failed: " + err.message });
        }
      }
    };
  } catch (err) {
    console.error("SQLite Worker Critical Error:", err);
    postMessage({
      type: "ERROR",
      data: "Gagal memuat database: " + err.message,
    });
  }
};

start();
