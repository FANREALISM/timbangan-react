import React, { useState, useEffect } from "react";
import "./App.css";

// Hooks
import { useSerialScale } from "./hooks/useSerialScale";
import { useWebsocketScale } from "./hooks/useWebsocketScale";
import { useScaleData } from "./hooks/useScaleData";
import { useWeightLogs } from "./hooks/useWeightLogs";
import { usePrinter } from "./hooks/usePrinter";

// Components
import ScalesDisplay from "./components/ScalesDisplay";
import ConnectionPanel from "./components/ConnectionPanel";
import WeightForm from "./components/WeightForm";
import WeightHistory from "./components/WeightHistory";

// Utils
import { isElectron, isPWA, getPlatform } from "./utils/platform";

function App() {
  const { weight, unit, handleData } = useScaleData();
  
  // Ambil IP dari .env atau default ke IP server Anda
  // PENTING: Untuk PWA, jangan gunakan localhost, gunakan IP Laptop Anda
  const [deviceIp, setDeviceIp] = useState("192.168.1.100");
  const [printerIp, setPrinterIp] = useState("192.168.1.101"); 
  const [productName, setProductName] = useState("");
  const [clientName, setClientName] = useState("");
  const [baudRate, setBaudRate] = useState(9600);
  const [manualPort, setManualPort] = useState("");

  const { logs, saveWeight, fetchLogs } = useWeightLogs();
  const { printerStatus, connectPrinter, disconnectPrinter, printReceipt, isPrinting } = usePrinter();

  // Hook Serial: Sekarang mendukung Web Serial (PWA) & SerialPort (Electron)
  const { connectSerial, status: serialStatus, disconnectSerial } = useSerialScale(handleData);
  
  // Hook WebSocket: Untuk timbangan berbasis WiFi
  const { connectWS, disconnectWS, status: wsStatus } = useWebsocketScale(handleData);

  // Tentukan status koneksi & warna UI
  const isOnline = wsStatus === "Connected (WS)" || serialStatus.includes("Connected");
  const curStatus = serialStatus !== "Disconnected" ? serialStatus : wsStatus;

  const handleConnectSerial = () => {
    // Web Serial API (PWA) tidak butuh path port, akan muncul picker otomatis
    connectSerial(Number(baudRate)); 
  };

  const handleSave = async (shouldPrint = false) => {
    const numericWeight = parseFloat(weight.toString().replace(/[^\d.-]/g, ''));
    
    if (!productName || isNaN(numericWeight)) {
      alert("Nama produk atau berat tidak boleh kosong!");
      return;
    }

    // 1. Simpan ke Database
    const success = await saveWeight({
      product: productName,
      client: clientName || "-",
      weight: numericWeight, 
      unit: unit || "kg",
    });

    // 2. Jika Berhasil & User pilih Cetak
    if (success && shouldPrint) {
      await printReceipt({
        title: "TCONNECT RECEIPT",
        details: [
          `Tanggal: ${new Date().toLocaleString()}`,
          `Barang : ${productName}`,
          `Client : ${clientName || "-"}`,
          `Berat  : ${numericWeight} ${unit}`,
        ],
        footer: "Terima Kasih"
      });
    }

    if (success) {
      setProductName("");
      setClientName("");
      await fetchLogs();
    }
  };

  // Auto-fetch data saat aplikasi pertama kali dibuka
  useEffect(() => {
    fetchLogs();
    console.log(`Running on: ${getPlatform()}`);
  }, [fetchLogs]);

  return (
    <div className="container py-3" style={{ maxWidth: '600px', margin: '0 auto' }}>
      
      {/* Tampilan Angka Timbangan */}
      <ScalesDisplay 
        weight={weight} 
        unit={unit} 
        status={curStatus} 
        isConnected={isOnline} 
      />

      <div className="mt-3">
        {/* Panel Koneksi Hardware */}
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
        
        {/* Form Input Barang */}
        <WeightForm 
          productName={productName} setProductName={setProductName}
          clientName={clientName} setClientName={setClientName}
          handleSave={handleSave} 
          isOnline={isOnline}
          isPrinting={isPrinting}
        />
      </div>

      {/* Tabel Riwayat */}
      <WeightHistory logs={logs} />

      {/* Info Platform untuk Debug */}
      <div className="text-center mt-4 opacity-50" style={{ fontSize: '10px' }}>
        Platform: {getPlatform().toUpperCase()} | v4.0 PWA-Ready
      </div>
    </div>
  );
}

export default App;