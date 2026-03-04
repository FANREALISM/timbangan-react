// SQLite Worker - Static version in public/ with Persistence Optimization
const init = async () => {
  try {
    console.log("Worker: Starting initialization...");

    // Import from local public directory
    const { default: sqlite3InitModule } =
      await import("/sqlite-wasm/index.mjs");

    console.log("Worker: SQLite module loaded, initializing...");
    const sqlite3 = await sqlite3InitModule({
      print: console.log,
      printErr: console.error,
      // Point to local WASM file
      locateFile: (file) => `/sqlite-wasm/${file}`,
    });

    let db;
    let isFallback = false;

    console.log("Worker: Checking OPFS availability...");
    if ("opfs" in sqlite3) {
      try {
        // Menggunakan OpfsDb memastikan data tersimpan di Origin Private File System
        db = new sqlite3.oo1.OpfsDb("/timbangan_v6.db");

        // Optimasi untuk persistensi dan performa pada OPFS
        db.exec("PRAGMA journal_mode=WAL;");
        db.exec("PRAGMA synchronous=NORMAL;");

        console.log(
          "Worker: Persistent Database (OPFS) initialized with WAL mode.",
        );
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

    // Buat tabel jika belum ada
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
      data: {
        isFallback: isFallback,
        warning: isFallback
          ? "Penyimpanan permanen tidak didukung. Data akan hilang jika aplikasi di-refresh."
          : null,
      },
    });

    onmessage = function (e) {
      const { type, data } = e.data;
      if (type === "INSERT_LOG") {
        try {
          db.exec({
            sql: `INSERT INTO timbangan_logs (product_name, client_name, gross_weight, unit_used) VALUES (?, ?, ?, ?)`,
            bind: [data.product, data.client, data.weight, data.unit],
          });

          // Memastikan data ter-flush ke storage setelah insert
          // SQLite OPFS biasanya otomatis, tapi checkpoint membantu konsistensi WAL
          db.exec("PRAGMA wal_checkpoint(PASSIVE);");

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

init();
