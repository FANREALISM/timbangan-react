import React, { useState, useEffect, useCallback } from "react";
import "./App.css";

// Hooks - Pastikan path ini sesuai dengan struktur folder src/hooks Anda
import { useSerialScale } from "./hooks/useSerialScale";
import { useWebsocketScale } from "./hooks/useWebsocketScale";
import { useScaleData } from "./hooks/useScaleData";
import { usePrinter } from "./hooks/usePrinter";

// Components - Pastikan path ini sesuai dengan struktur folder src/components Anda
import ScalesDisplay from "./components/scalesDisplay";
import ConnectionPanel from "./components/ConnectionPanel";
import WeightForm from "./components/WeightForm";
import WeightHistory from "./components/WeightHistory";

// Utils
import { getPlatform } from "./utils/platform";

function App() {
  // 1. Hooks untuk data timbangan
  const { weight, unit, handleData } = useScaleData();
  
  // 2. State untuk Form & Input
  const [productName, setProductName] = useState("");
  const [clientName, setClientName] = useState("");
  const [deviceIp, setDeviceIp] = useState("192.168.1.100");
  const [printerIp, setPrinterIp] = useState("192.168.1.101");
  const [baudRate, setBaudRate] = useState(9600);
  const [manualPort, setManualPort] = useState("");

  // 3. State untuk Database Lokal (SQLite WASM)
  const [logs, setLogs] = useState([]);
  const [dbWorker, setDbWorker] = useState(null);
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState(null);
  const [dbWarning, setDbWarning] = useState(null);

  // 4. Hook Koneksi Hardware
  const { printerStatus, connectPrinter, disconnectPrinter, printReceipt, isPrinting } = usePrinter();
  const { connectSerial, status: serialStatus, disconnectSerial } = useSerialScale(handleData);
  const { connectWS, disconnectWS, status: wsStatus } = useWebsocketScale(handleData);

  // Helper status koneksi
  const isOnline = wsStatus === "Connected (WS)" || serialStatus.includes("Connected");
  const curStatus = serialStatus !== "Disconnected" ? serialStatus : wsStatus;

  // --- 5. Inisialisasi Web Worker untuk SQLite ---
  useEffect(() => {
    // Gunakan static worker di public/ untuk menghindari error build PWA pada Rollup/Vercel
    const worker = new Worker("/dbWorker.js", { type: "module" });

    worker.onmessage = (e) => {
      const { type, data } = e.data;
      
      switch (type) {
        case "DB_READY":
          setDbReady(true);
          setDbError(null);
          if (data && data.isFallback) {
            setDbWarning("Penyimpanan lokal tidak tersedia. Data akan hilang jika refresh.");
          }
          console.log("Worker: Database Ready", data);
          worker.postMessage({ type: "GET_LOGS" });
          break;
        case "LOGS_DATA":
          setLogs(data || []);
          break;
        case "SUCCESS_INSERT":
          // Refresh data setelah berhasil simpan
          worker.postMessage({ type: "GET_LOGS" });
          break;
        case "ERROR":
          console.error("Worker Error:", data);
          setDbError(data);
          setDbReady(false);
          break;
        default:
          break;
      }
    };

    setDbWorker(worker);
    
    // Cleanup saat aplikasi ditutup
    return () => {
      worker.terminate();
    };
  }, []);

  // --- 6. Handler untuk Simpan Data ---
  const handleSave = useCallback(async (shouldPrint = false) => {
    // Validasi dasar
    if (!productName.trim()) {
      alert("Nama produk wajib diisi!");
      return;
    }

    // Pastikan angka valid
    const cleanWeight = parseFloat(weight);
    if (isNaN(cleanWeight)) {
      alert("Berat tidak valid!");
      return;
    }

    if (dbWorker && dbReady) {
      // Kirim data ke worker untuk disimpan ke SQLite (OPFS)
      dbWorker.postMessage({
        type: "INSERT_LOG",
        data: {
          product: productName,
          client: clientName || "-",
          weight: cleanWeight,
          unit: unit || "kg",
        },
      });

      // Cetak struk jika tombol "Simpan & Cetak" ditekan
      if (shouldPrint) {
        try {
          await printReceipt({
            title: "T-CONNECT SCALE",
            details: [
              `Waktu  : ${new Date().toLocaleString()}`,
              `Produk : ${productName}`,
              `Client : ${clientName || "-"}`,
              `Berat  : ${cleanWeight} ${unit}`,
            ],
            footer: "Terima Kasih",
          });
        } catch (err) {
          console.error("Gagal mencetak:", err);
        }
      }

      // Reset form input
      setProductName("");
      setClientName("");
    } else {
      alert("Database sedang inisialisasi, mohon tunggu...");
    }
  }, [dbWorker, dbReady, productName, clientName, weight, unit, printReceipt]);

  return (
    <div className="container py-3" style={{ maxWidth: "600px", margin: "0 auto" }}>
      
      {/* Header & Display Berat */}
      <ScalesDisplay 
        weight={weight} 
        unit={unit} 
        status={curStatus} 
        isConnected={isOnline} 
      />

      <div className="mt-3">
        {/* Pengaturan Koneksi */}
        <ConnectionPanel
          deviceIp={deviceIp} setDeviceIp={setDeviceIp}
          printerIp={printerIp} setPrinterIp={setPrinterIp}
          scaleBaudRate={baudRate} setScaleBaudRate={setBaudRate}
          manualPort={manualPort} setManualPort={setManualPort}
          connectSerial={() => connectSerial(Number(baudRate))}
          connectWS={() => connectWS(deviceIp)}
          disconnectWS={() => {
            disconnectWS();
            disconnectSerial();
          }}
          connectPrinter={connectPrinter}
          disconnectPrinter={disconnectPrinter}
          printerStatus={printerStatus}
        />
        
        {/* Form Input Data */}
        <WeightForm 
          productName={productName} 
          setProductName={setProductName}
          clientName={clientName} 
          setClientName={setClientName}
          handleSave={handleSave} 
          isOnline={isOnline} 
          isPrinting={isPrinting}
        />
      </div>

      {/* Tabel Riwayat dari SQLite */}
      <WeightHistory logs={logs} />

      <div className="text-center mt-4 opacity-50" style={{ fontSize: "10px" }}>
        PLATFORM: {getPlatform().toUpperCase()} | 
        DB STATUS: {dbError ? (
          <span className="text-danger">ERROR: {dbError}</span>
        ) : dbReady ? (
          <>
            <span className="text-success">READY {dbWarning ? "(MEMORY)" : "(OPFS)"}</span>
            {dbWarning && <div className="text-warning mt-1">{dbWarning}</div>}
          </>
        ) : (
          "INITIALIZING..."
        )}
      </div>
    </div>
  );
}

export default App;