// Import from CDN using absolute URL (required for static worker files loaded without Vite transform)
const { default: sqlite3InitModule } =
  await import("https://cdn.jsdelivr.net/npm/@sqlite.org/sqlite-wasm@3.51.2-build6/dist/index.mjs");

const start = async () => {
  try {
    const sqlite3 = await sqlite3InitModule({
      print: console.log,
      printErr: console.error,
    });

    if ("opfs" in sqlite3) {
      const db = new sqlite3.oo1.OpfsDb("/timbangan_v5.db");

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

      postMessage({ type: "DB_READY" });

      onmessage = function (e) {
        const { type, data } = e.data;
        if (type === "INSERT_LOG") {
          db.exec({
            sql: `INSERT INTO timbangan_logs (product_name, client_name, gross_weight, unit_used) VALUES (?, ?, ?, ?)`,
            bind: [data.product, data.client, data.weight, data.unit],
          });
          postMessage({ type: "SUCCESS_INSERT" });
        }
        if (type === "GET_LOGS") {
          const rows = [];
          db.exec({
            sql: "SELECT * FROM timbangan_logs ORDER BY id DESC LIMIT 50",
            rowMode: "object",
            callback: (row) => rows.push(row),
          });
          postMessage({ type: "LOGS_DATA", data: rows });
        }
      };
    } else {
      console.error("Worker: OPFS not available in this browser");
      postMessage({ type: "ERROR", data: "OPFS not supported" });
    }
  } catch (err) {
    console.error("SQLite Worker Error:", err);
    postMessage({ type: "ERROR", data: err.message });
  }
};

start();
