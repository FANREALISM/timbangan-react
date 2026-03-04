// SQLite Worker - Robust Universal Persistence Version
// Uses IndexedDB as a reliable fallback for OPFS.

const DB_FILE_NAME = "timbangan_v8.db";
const IDB_NAME = "sqlite_storage";
const IDB_STORE = "files";

// Robust IndexedDB helpers
const idb = {
  db: null,
  async open() {
    if (this.db) return this.db;
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
      req.onsuccess = () => {
        this.db = req.result;
        resolve(this.db);
      };
      req.onerror = () => reject(req.error);
    });
  },
  async get(key) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readonly");
      const req = tx.objectStore(IDB_STORE).get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  },
  async set(key, val) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readwrite");
      const req = tx.objectStore(IDB_STORE).put(val, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  },
};

const init = async () => {
  try {
    console.log("Worker: Initializing SQLite...");
    const { default: sqlite3InitModule } =
      await import("/sqlite-wasm/index.mjs");
    const sqlite3 = await sqlite3InitModule({
      print: console.log,
      printErr: console.error,
      locateFile: (file) => `/sqlite-wasm/${file}`,
    });

    let db;
    let storageMethod = "MEMORY";

    // 1. Try OPFS
    console.log("Worker: Testing OPFS...");
    if ("opfs" in sqlite3) {
      try {
        db = new sqlite3.oo1.OpfsDb("/" + DB_FILE_NAME);
        storageMethod = "OPFS";
        console.log("Worker: OPFS Storage used.");
      } catch (e) {
        console.warn("Worker: OPFS not usable, trying IndexedDB fallback.");
      }
    }

    // 2. Fallback to Memory + IndexedDB sync
    if (!db) {
      console.log("Worker: Loading from IndexedDB...");
      const bytes = await idb.get(DB_FILE_NAME);
      if (bytes) {
        console.log(
          `Worker: Restoring ${bytes.byteLength} bytes from IndexedDB`,
        );
        db = new sqlite3.oo1.DB();
        const rc = sqlite3.capi.sqlite3_deserialize(
          db.pointer,
          "main",
          sqlite3.wasm.allocFromTypedArray(bytes),
          bytes.byteLength,
          bytes.byteLength,
          sqlite3.capi.SQLITE_DESERIALIZE_FREEONCLOSE |
            sqlite3.capi.SQLITE_DESERIALIZE_RESIZEABLE,
        );
        console.log("Worker: Database restored from IndexedDB.");
      } else {
        console.log("Worker: No existing data, creating new memory database.");
        db = new sqlite3.oo1.DB();
      }
      storageMethod = "INDEXEDDB";
    }

    // DB Setup
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

    const syncToStorage = async () => {
      if (storageMethod === "INDEXEDDB") {
        try {
          const bytes = sqlite3.wasm.exportArray(db, { save: false });
          await idb.set(DB_FILE_NAME, bytes);
          console.log(`Worker: Synced ${bytes.byteLength} bytes to IndexedDB.`);
        } catch (e) {
          console.error("Worker: Sync failed", e);
        }
      }
    };

    // Initial sync
    await syncToStorage();

    postMessage({
      type: "DB_READY",
      data: { method: storageMethod },
    });

    onmessage = async ({ data: { type, data } }) => {
      try {
        if (type === "INSERT_LOG") {
          db.exec({
            sql: "INSERT INTO timbangan_logs (product_name, client_name, gross_weight, unit_used) VALUES (?, ?, ?, ?)",
            bind: [data.product, data.client, data.weight, data.unit],
          });
          await syncToStorage();
          postMessage({ type: "SUCCESS_INSERT" });
        } else if (type === "GET_LOGS") {
          const rows = [];
          db.exec({
            sql: "SELECT * FROM timbangan_logs ORDER BY id DESC LIMIT 50",
            rowMode: "object",
            callback: (r) => rows.push(r),
          });
          postMessage({ type: "LOGS_DATA", data: rows });
        }
      } catch (e) {
        postMessage({ type: "ERROR", data: e.message });
      }
    };
  } catch (err) {
    console.error("Worker FATAL:", err);
    postMessage({
      type: "ERROR",
      data: "Initialization failed: " + err.message,
    });
  }
};

init();
