// SQLite Worker - Static version in public/ with Universal Persistence Fallback
// This version uses IndexedDB to store the DB file if OPFS is not available.

const DB_NAME = "sqlite_storage";
const STORE_NAME = "db_data";
const DB_FILE_KEY = "timbangan_v7.db";

// Helper to open IndexedDB
const openIDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// Helper to load DB from IDB
const loadFromIDB = async () => {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).get(DB_FILE_KEY);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// Helper to save DB to IDB
const saveToIDB = async (data) => {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const request = transaction.objectStore(STORE_NAME).put(data, DB_FILE_KEY);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

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
      locateFile: (file) => `/sqlite-wasm/${file}`,
    });

    let db;
    let isOpfs = false;

    console.log("Worker: Checking OPFS availability...");
    if ("opfs" in sqlite3) {
      try {
        db = new sqlite3.oo1.OpfsDb("/" + DB_FILE_KEY);
        db.exec("PRAGMA journal_mode=WAL;");
        db.exec("PRAGMA synchronous=NORMAL;");
        isOpfs = true;
        console.log("Worker: Persistent Database (OPFS) initialized.");
      } catch (err) {
        console.warn(
          "Worker: Failed to open OPFS DB, falling back to IndexedSync:",
          err,
        );
      }
    }

    if (!isOpfs) {
      console.log("Worker: Loading database from IndexedDB...");
      const savedData = await loadFromIDB();

      if (savedData) {
        console.log(
          "Worker: Restoring data from IndexedDB (" +
            savedData.byteLength +
            " bytes)",
        );
        const p = sqlite3.wasm.allocFromTypedArray(savedData);
        db = new sqlite3.oo1.DB();
        const rc = sqlite3.capi.sqlite3_deserialize(
          db.pointer,
          "main",
          p,
          savedData.byteLength,
          savedData.byteLength,
          sqlite3.capi.SQLITE_DESERIALIZE_FREEONCLOSE,
        );
        sqlite3.wasm.dealloc(p); // Clean up temp buffer
      } else {
        console.log(
          "Worker: No saved data in IndexedDB, creating new memory database.",
        );
        db = new sqlite3.oo1.DB();
      }
      console.log("Worker: Hybrid Database (Memory -> IndexedDB) initialized.");
    }

    // Helper to trigger save if using IDB
    const triggerSync = async () => {
      if (!isOpfs) {
        try {
          // Export memory DB to buffer
          const buffer = sqlite3.capi.sqlite3_serialize(
            db.pointer,
            "main",
            0,
            0,
          );
          const data = sqlite3.wasm.heapForSize(buffer).slice(0, 0); // Placeholder logic

          // Actually, sqlite-wasm has a better way for built-in serialize
          const byteArray = sqlite3.wasm.serialize(db);
          await saveToIDB(byteArray);
          console.log("Worker: Data synced to IndexedDB");
        } catch (err) {
          console.error("Worker: Failed to sync to IndexedDB:", err);
        }
      } else {
        db.exec("PRAGMA wal_checkpoint(PASSIVE);");
      }
    };

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

    // First sync after init just in case
    await triggerSync();

    postMessage({
      type: "DB_READY",
      data: { isFallback: !isOpfs },
    });

    onmessage = function (e) {
      const { type, data } = e.data;
      if (type === "INSERT_LOG") {
        try {
          db.exec({
            sql: `INSERT INTO timbangan_logs (product_name, client_name, gross_weight, unit_used) VALUES (?, ?, ?, ?)`,
            bind: [data.product, data.client, data.weight, data.unit],
          });

          triggerSync(); // Save after write
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
