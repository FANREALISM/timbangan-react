import { useState, useEffect, useCallback, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { SQLiteConnection, CapacitorSQLite } from "@capacitor-community/sqlite";
import { getApiUrl } from "../utils/platform";

const DB_NAME = "timbangan_v8";

export function useDatabase(serverIp = "192.168.1.100") {
  const [logs, setLogs] = useState([]);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState(null);
  const [method, setMethod] = useState("INITIALIZING");
  const [saveMode, setSaveMode] = useState("hybrid"); // default

  const dbRef = useRef(null);
  const workerRef = useRef(null);

  // 1. Fetch Config from Server
  useEffect(() => {
    fetch(getApiUrl("/api/config", serverIp))
      .then((res) => res.json())
      .then((json) => {
        if (json.status === "success") {
          setSaveMode(json.data.save_mode);
        }
      })
      .catch((err) => console.error("Config fetch error:", err));
  }, [serverIp]);

  // 2. Init Native (Android)
  const initNative = async () => {
    try {
      const sqlite = new SQLiteConnection(CapacitorSQLite);
      const dbConn = await sqlite.createConnection(
        DB_NAME,
        false,
        "no-encryption",
        1,
        false,
      );
      await dbConn.open();
      await dbConn.execute(`
        CREATE TABLE IF NOT EXISTS timbangan_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          product_name TEXT NOT NULL,
          client_name TEXT,
          gross_weight REAL,
          unit_used TEXT
        );
      `);
      dbRef.current = dbConn;
      setMethod("NATIVE");
      setIsReady(true);
    } catch (err) {
      console.error("Native DB Init Error:", err);
      setError(err.message);
    }
  };

  // 3. Init Web (PWA)
  const initWeb = () => {
    // We use a simple string for the Worker to prevent Vite from trying to
    // bundle the worker asset internally, which causes PWA plugin errors in this setup.
    // In Capacitor context, we don't use this Web Worker for DB anyway (we use Native),
    // but we ensure it doesn't break the build.
    try {
      const workerUrl = `${window.location.origin}/dbWorker.js`;
      const worker = new Worker(workerUrl, {
        type: "module",
      });
      worker.onmessage = (e) => {
        const { type, data } = e.data;
        if (type === "DB_READY") {
          setMethod(data.method || "WEB_WASM");
          setIsReady(true);
          worker.postMessage({ type: "GET_LOGS" });
        } else if (type === "LOGS_DATA") {
          setLogs(data || []);
        }
      };
      workerRef.current = worker;
    } catch (err) {
      console.error("Worker Init Error:", err);
      setError("Gagal inisialisasi database (Worker)");
    }
  };

  useEffect(() => {
    // Di Capacitor, jika saveMode adalah 'server', kita tidak perlu init local DB
    // kecuali jika kita ingin hybrid. Namun initNative sekarang dipanggil di sini.
    if (Capacitor.isNativePlatform()) {
      initNative();
    } else {
      initWeb();
    }
    return () => {
      if (workerRef.current) workerRef.current.terminate();
      if (dbRef.current) {
        try {
          dbRef.current.close();
        } catch (e) {}
      }
    };
  }, []);

  const refreshLogs = useCallback(async () => {
    // If server only, fetch from API
    if (saveMode === "server") {
      try {
        const res = await fetch(getApiUrl("/api/logs", serverIp));
        const json = await res.json();
        if (json.status === "success") setLogs(json.data);
      } catch (err) {
        console.error("Fetch API Logs Error:", err);
      }
      return;
    }

    // Else fetch from local
    if (Capacitor.isNativePlatform() && dbRef.current) {
      const res = await dbRef.current.query(
        "SELECT * FROM timbangan_logs ORDER BY id DESC LIMIT 50",
      );
      setLogs(res.values || []);
    } else if (workerRef.current) {
      workerRef.current.postMessage({ type: "GET_LOGS" });
    }
  }, [saveMode, serverIp]);

  const saveLog = useCallback(
    async (data) => {
      // 1. Save to Server
      if (saveMode === "server" || saveMode === "hybrid") {
        try {
          await fetch(getApiUrl("/api/weight", serverIp), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          });
        } catch (err) {
          console.error("API Save Error:", err);
        }
      }

      // 2. Save to Local
      if (saveMode === "local" || saveMode === "hybrid") {
        if (Capacitor.isNativePlatform() && dbRef.current) {
          await dbRef.current.run(
            "INSERT INTO timbangan_logs (product_name, client_name, gross_weight, unit_used) VALUES (?, ?, ?, ?)",
            [data.product, data.client, data.weight, data.unit],
          );
        } else if (workerRef.current) {
          workerRef.current.postMessage({ type: "INSERT_LOG", data });
        }
      }

      // Refresh after a slight delay
      setTimeout(refreshLogs, 200);
    },
    [saveMode, refreshLogs, serverIp],
  );

  const deleteLog = useCallback(
    async (id) => {
      // 1. Delete from Server
      if (saveMode === "server" || saveMode === "hybrid") {
        try {
          await fetch(getApiUrl(`/api/logs/${id}`, serverIp), {
            method: "DELETE",
          });
        } catch (err) {
          console.error("API Delete Error:", err);
        }
      }

      // 2. Delete from Local
      if (saveMode === "local" || saveMode === "hybrid") {
        if (Capacitor.isNativePlatform() && dbRef.current) {
          await dbRef.current.run("DELETE FROM timbangan_logs WHERE id = ?", [
            id,
          ]);
        } else if (workerRef.current) {
          workerRef.current.postMessage({ type: "DELETE_LOG", data: { id } });
        }
      }

      setTimeout(refreshLogs, 200);
    },
    [saveMode, refreshLogs, serverIp],
  );

  useEffect(() => {
    if (isReady) refreshLogs();
  }, [isReady, saveMode, refreshLogs]);

  return {
    logs,
    isReady,
    error,
    method,
    saveLog,
    refreshLogs,
    deleteLog,
    saveMode,
  };
}
