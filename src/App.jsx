import React, { useState, useEffect, useCallback } from "react";
import "./App.css";

// Hooks
import { useSerialScale } from "./hooks/useSerialScale";
import { useWebsocketScale } from "./hooks/useWebsocketScale";
import { useScaleData } from "./hooks/useScaleData";
import { usePrinter } from "./hooks/usePrinter";

// Components
import ScalesDisplay from "./components/scalesDisplay";
import ConnectionPanel from "./components/ConnectionPanel";
import WeightForm from "./components/WeightForm";
import WeightHistory from "./components/WeightHistory";

// Utils
import { getPlatform } from "./utils/platform";

function App() {
  const { weight, unit, handleData } = useScaleData();
  
  // State Konfigurasi & Form
  const [deviceIp, setDeviceIp] = useState("192.168.1.100");
  const [printerIp, setPrinterIp] = useState("192.168.1.101");
  const [productName, setProductName] = useState("");
  const [clientName, setClientName] = useState("");
  const [baudRate, setBaudRate] = useState(9600);
  const [manualPort, setManualPort] = useState("");

  // State Database Lokal (SQLite WASM)
  const [logs, setLogs] = useState([]);
  const [dbWorker, setDbWorker] = useState(null);
  const [dbReady, setDbReady] = useState(false);

  const { printerStatus, connectPrinter, disconnectPrinter, printReceipt, isPrinting } = usePrinter();

  // Hook Koneksi
  const { connectSerial, status: serialStatus, disconnectSerial } = useSerialScale(handleData);
  const { connectWS, disconnectWS, status: wsStatus } = useWebsocketScale(handleData);

  const isOnline = wsStatus === "Connected (WS)" || serialStatus.includes("Connected");
  const curStatus = serialStatus !== "Disconnected" ? serialStatus : wsStatus;

  // --- Inisialisasi SQLite WASM Worker ---
  useEffect(() => {
    // Gunakan URL absolut untuk menghindari error Vite dev server 404 pada .wasm
    // Pastikan dbWorker.js ada di folder src/
    const worker = new Worker(new URL('./dbWorker.js', import.meta.url), { 
      type: 'module',
      name: 'sqlite-worker'
    });
    
    worker.onmessage = (e) => {
      const { type, data, error } = e.data;

      if (type === 'DB_READY') {
        console.log("✅ Database SQLite WASM siap di OPFS");
        setDbReady(true);
        // Ambil data pertama kali setelah db siap
        worker.postMessage({ type: 'GET_LOGS' });
      }

      if (type === 'LOGS_DATA') {
        console.log("📥 Menerima data logs:", data);
        setLogs(data || []);
      }

      if (type === 'SUCCESS_INSERT') {
        console.log("💾 Data berhasil disimpan ke SQLite");
        // Refresh data setelah berhasil menyimpan
        worker.postMessage({ type: 'GET_LOGS' });
      }

      if (error) {
        console.error("❌ Worker Error:", error);
      }
    };

    setDbWorker(worker);

    console.log(`Running on: ${getPlatform()}`);

    return () => {
      worker.terminate();
    };
  }, []);

  const handleConnectSerial = () => {
    connectSerial(Number(baudRate));
  };

  // --- Fungsi Simpan ke SQLite Lokal ---
  const handleSave = async (shouldPrint = false) => {
    // Bersihkan angka dari satuan jika ada (misal "10.5 kg" -> 10.5)
    const numericWeight = parseFloat(weight.toString().replace(/[^\d.-]/g, ''));
    
    if (!productName || isNaN(numericWeight)) {
      alert("Nama produk atau berat tidak boleh kosong!");
      return;
    }

    if (dbWorker && dbReady) {
      // Mengirim data ke worker untuk disimpan ke file .db di browser
      dbWorker.postMessage({
        type: 'INSERT_LOG',
        data: {
          product: productName,
          client: clientName || "-",
          weight: numericWeight, 
          unit: unit || "kg",
        }
      });

      // Logika Cetak Struk
      if (shouldPrint) {
        try {
          await printReceipt({
            title: "TCONNECT RECEIPT",
            details: [
              `Tanggal: ${new Date().toLocaleString()}`,
              `Barang : ${productName}`,
              `Client : ${clientName || "-"}`,
              `Berat  : ${numericWeight} ${unit || "kg"}`,
            ],
            footer: "Simpanan Lokal (Privat)"
          });
        } catch (err) {
          console.error("Gagal mencetak:", err);
        }
      }

      // Reset form setelah berhasil kirim perintah simpan
      setProductName("");
      setClientName("");
    } else {
      alert("Database belum siap! Mohon tunggu sebentar.");
    }
  };

  return (
    <div className="container py-3" style={{ maxWidth: '600px', margin: '0 auto' }}>
      
      <ScalesDisplay 
        weight={weight} 
        unit={unit} 
        status={curStatus} 
        isConnected={isOnline} 
      />

      <div className="mt-3">
        <ConnectionPanel
          deviceIp={deviceIp} setDeviceIp={setDeviceIp}
          printerIp={printerIp} setPrinterIp={setPrinterIp}
          scaleBaudRate={baudRate} setScaleBaudRate={setBaudRate}
          manualPort={manualPort} setManualPort={setManualPort}
          connectSerial={handleConnectSerial} 
          connectWS={() => connectWS(deviceIp)}
          disconnectWS={() => {
            disconnectWS();
            disconnectSerial();
          }}
          connectPrinter={connectPrinter}
          disconnectPrinter={disconnectPrinter}
          printerStatus={printerStatus}
        />
        
        <WeightForm 
          productName={productName} setProductName={setProductName}
          clientName={clientName} setClientName={setClientName}
          handleSave={handleSave} 
          isOnline={isOnline}
          isPrinting={isPrinting}
          dbReady={dbReady}
        />
      </div>

      <hr className="my-4" />
      <h5 className="mb-3">Riwayat Timbangan (Lokal)</h5>
      
      {/* Tabel Riwayat dari state logs lokal */}
      <WeightHistory logs={logs} />

      <div className="text-center mt-4 opacity-50" style={{ fontSize: '10px' }}>
        Platform: {getPlatform().toUpperCase()} | v5.0 SQLite-WASM OPFS Mode | 
        DB Status: {dbReady ? "READY" : "INITIALIZING..."}
      </div>
    </div>
  );
}

export default App;