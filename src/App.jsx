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

  const { printerStatus, connectPrinter, disconnectPrinter, printReceipt, isPrinting } = usePrinter();

  // Hook Koneksi
  const { connectSerial, status: serialStatus, disconnectSerial } = useSerialScale(handleData);
  const { connectWS, disconnectWS, status: wsStatus } = useWebsocketScale(handleData);

  const isOnline = wsStatus === "Connected (WS)" || serialStatus.includes("Connected");
  const curStatus = serialStatus !== "Disconnected" ? serialStatus : wsStatus;

  // --- Inisialisasi SQLite WASM Worker ---
  useEffect(() => {
    // Memanggil worker yang mengelola SQLite di OPFS
    const worker = new Worker(new URL('./dbWorker.js', import.meta.url));
    
    worker.onmessage = (e) => {
      if (e.data.type === 'LOGS_DATA') {
        setLogs(e.data.data); // Update tabel riwayat dengan data dari SQLite lokal
      }
      if (e.data.type === 'SUCCESS_INSERT') {
        // Refresh data setelah berhasil menyimpan
        worker.postMessage({ type: 'GET_LOGS' });
      }
    };

    setDbWorker(worker);
    worker.postMessage({ type: 'GET_LOGS' }); // Ambil data awal saat aplikasi dimuat

    console.log(`Running on: ${getPlatform()}`);

    return () => worker.terminate();
  }, []);

  const handleConnectSerial = () => {
    connectSerial(Number(baudRate));
  };

  // --- Fungsi Simpan ke SQLite Lokal ---
  const handleSave = async (shouldPrint = false) => {
    const numericWeight = parseFloat(weight.toString().replace(/[^\d.-]/g, ''));
    
    if (!productName || isNaN(numericWeight)) {
      alert("Nama produk atau berat tidak boleh kosong!");
      return;
    }

    if (dbWorker) {
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
        await printReceipt({
          title: "TCONNECT RECEIPT",
          details: [
            `Tanggal: ${new Date().toLocaleString()}`,
            `Barang : ${productName}`,
            `Client : ${clientName || "-"}`,
            `Berat  : ${numericWeight} ${unit}`,
          ],
          footer: "Simpanan Lokal (Privat)"
        });
      }

      // Reset form setelah berhasil
      setProductName("");
      setClientName("");
    } else {
      alert("Database belum siap!");
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
        />
      </div>

      {/* Tabel Riwayat dari state logs lokal */}
      <WeightHistory logs={logs} />

      <div className="text-center mt-4 opacity-50" style={{ fontSize: '10px' }}>
        Platform: {getPlatform().toUpperCase()} | v5.0 SQLite-WASM OPFS Mode
      </div>
    </div>
  );
}

export default App;