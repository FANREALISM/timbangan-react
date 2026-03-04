import React, { useState, useEffect } from "react";
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
  
  const [productName, setProductName] = useState("");
  const [clientName, setClientName] = useState("");
  const [deviceIp, setDeviceIp] = useState("192.168.1.100");
  const [printerIp, setPrinterIp] = useState("192.168.1.101");
  const [baudRate, setBaudRate] = useState(9600);
  const [manualPort, setManualPort] = useState("");

  const [logs, setLogs] = useState([]);
  const [dbWorker, setDbWorker] = useState(null);
  const [dbReady, setDbReady] = useState(false);

  const { printerStatus, connectPrinter, disconnectPrinter, printReceipt, isPrinting } = usePrinter();
  const { connectSerial, status: serialStatus, disconnectSerial } = useSerialScale(handleData);
  const { connectWS, disconnectWS, status: wsStatus } = useWebsocketScale(handleData);

  const isOnline = wsStatus === "Connected (WS)" || serialStatus.includes("Connected");
  const curStatus = serialStatus !== "Disconnected" ? serialStatus : wsStatus;

  useEffect(() => {
    // Vite akan otomatis mendeteksi ini sebagai worker entry point
    const worker = new Worker(new URL("./dbWorker.js", import.meta.url), {
      type: "module",
    });

    worker.onmessage = (e) => {
      const { type, data } = e.data;
      if (type === "DB_READY") {
        setDbReady(true);
        worker.postMessage({ type: "GET_LOGS" });
      }
      if (type === "LOGS_DATA") {
        setLogs(data || []);
      }
      if (type === "SUCCESS_INSERT") {
        worker.postMessage({ type: "GET_LOGS" });
      }
    };

    setDbWorker(worker);
    return () => worker.terminate();
  }, []);

  const handleSave = async (shouldPrint = false) => {
    const numericWeight = parseFloat(weight.toString().replace(/[^\d.-]/g, ""));
    
    if (!productName || isNaN(numericWeight)) {
      alert("Nama produk atau berat tidak boleh kosong!");
      return;
    }

    if (dbWorker && dbReady) {
      dbWorker.postMessage({
        type: "INSERT_LOG",
        data: {
          product: productName,
          client: clientName || "-",
          weight: numericWeight,
          unit: unit || "kg",
        },
      });

      if (shouldPrint) {
        await printReceipt({
          title: "TCONNECT RECEIPT",
          details: [
            `Tanggal: ${new Date().toLocaleString()}`,
            `Barang : ${productName}`,
            `Client : ${clientName || "-"}`,
            `Berat  : ${numericWeight} ${unit}`,
          ],
          footer: "Simpanan Lokal",
        });
      }

      setProductName("");
      setClientName("");
    } else {
      alert("Database belum siap!");
    }
  };

  return (
    <div className="container py-3" style={{ maxWidth: "600px", margin: "0 auto" }}>
      <ScalesDisplay weight={weight} unit={unit} status={curStatus} isConnected={isOnline} />

      <div className="mt-3">
        <ConnectionPanel
          deviceIp={deviceIp} setDeviceIp={setDeviceIp}
          printerIp={printerIp} setPrinterIp={setPrinterIp}
          scaleBaudRate={baudRate} setScaleBaudRate={setBaudRate}
          manualPort={manualPort} setManualPort={setManualPort}
          connectSerial={() => connectSerial(Number(baudRate))}
          connectWS={() => connectWS(deviceIp)}
          disconnectWS={() => { disconnectWS(); disconnectSerial(); }}
          connectPrinter={connectPrinter}
          disconnectPrinter={disconnectPrinter}
          printerStatus={printerStatus}
        />
        <WeightForm 
          productName={productName} setProductName={setProductName}
          clientName={clientName} setClientName={setClientName}
          handleSave={handleSave} isOnline={isOnline} isPrinting={isPrinting}
        />
      </div>

      <WeightHistory logs={logs} />

      <div className="text-center mt-4 opacity-50" style={{ fontSize: "10px" }}>
        Platform: {getPlatform().toUpperCase()} | DB: {dbReady ? "READY" : "INIT..."}
      </div>
    </div>
  );
}

export default App;