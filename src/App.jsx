import React, { useState, useCallback, useMemo } from "react";
import "./App.css";

// Hooks
import { useSerialScale } from "./hooks/useSerialScale";
import { useWebsocketScale } from "./hooks/useWebsocketScale";
import { useScaleData } from "./hooks/useScaleData";
import { usePrinter } from "./hooks/usePrinter";
import { useDatabase } from "./hooks/useDatabase";

// Components
import ConnectionPanel from "./components/ConnectionPanel";

// Icons
import { 
  Database as DbIcon, 
  Activity, 
  Settings as SettingsIcon,
  Save,
  Printer as PrinterIcon,
  Trash2,
  Clock,
  Box,
  User
} from "lucide-react";

function App() {
  const { weight, unit, handleData } = useScaleData();
  const [productName, setProductName] = useState("");
  const [clientName, setClientName] = useState("");
  const [deviceIp, setDeviceIp] = useState("192.168.1.100");
  const [printerIp, setPrinterIp] = useState("192.168.1.101");
  const [baudRate, setBaudRate] = useState(9600);
  const [manualPort, setManualPort] = useState("");
  const [showSettings, setShowSettings] = useState(false);

  // Database Hook with SaveMode
  const { logs, isReady: dbReady, method: dbMethod, saveLog, deleteLog, saveMode } = useDatabase();

  // Hardware Hooks
  const { printerStatus, connectPrinter, disconnectPrinter, printReceipt, isPrinting } = usePrinter();
  const { connectSerial, status: serialStatus, disconnectSerial } = useSerialScale(handleData);
  const { connectWS, disconnectWS, status: wsStatus } = useWebsocketScale(handleData);

  const isOnline = useMemo(() => 
    wsStatus === "Connected (WS)" || serialStatus.includes("Connected"), 
    [wsStatus, serialStatus]
  );

  const handleSave = useCallback(async (shouldPrint = false) => {
    if (!productName.trim()) return alert("Produk wajib diisi!");
    const cleanWeight = parseFloat(weight);
    if (isNaN(cleanWeight)) return alert("Berat tidak valid!");

    if (!dbReady) return alert("DB belum siap...");

    await saveLog({
      product: productName,
      client: clientName || "-",
      weight: cleanWeight,
      unit: unit || "kg",
    });

    if (shouldPrint) {
      await printReceipt({
        title: "T-CONNECT PREMIUM",
        details: [
          `Waktu  : ${new Date().toLocaleString()}`,
          `Produk : ${productName}`,
          `Client : ${clientName || "-"}`,
          `Berat  : ${cleanWeight} ${unit}`,
        ],
        footer: "Powered by T-Connect",
      });
    }

    setProductName("");
    setClientName("");
  }, [dbReady, saveLog, productName, clientName, weight, unit, printReceipt]);

  const handleDelete = async (id) => {
    if (window.confirm("Hapus data ini?")) {
      await deleteLog(id);
    }
  };

  return (
    <div className="app-wrapper">
      {/* 1. LCD DISPLAY SECTION */}
      <section className="glass-card lcd-display mb-4">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <span className="lcd-unit">Gross Weight</span>
          <div className="status-badge">
            <div className={`dot ${isOnline ? 'dot-online' : ''}`} />
            <span style={{ fontSize: '10px', color: '#94a3b8' }}>
              {serialStatus !== "Disconnected" ? serialStatus : wsStatus}
            </span>
          </div>
        </div>
        <h1 className="lcd-value">{weight || "0.00"}</h1>
        <div className="text-end">
          <span className="lcd-unit" style={{ fontSize: '24px', color: '#22c55e' }}>{unit || "KG"}</span>
        </div>
      </section>

      {/* 2. FORM SECTION */}
      <section className="glass-card">
        <div className="row g-3">
          <div className="col-12 form-group">
            <label><Box size={14} className="me-1"/> Nama Produk</label>
            <input 
              type="text" 
              className="premium-input" 
              placeholder="Masukan nama barang..." 
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
            />
          </div>
          <div className="col-12 form-group">
            <label><User size={14} className="me-1"/> Nama Client</label>
            <input 
              type="text" 
              className="premium-input" 
              placeholder="Masukan nama supplier..." 
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
            />
          </div>
        </div>

        <div className="d-grid gap-3 mt-4">
          <button className="btn-premium btn-success" onClick={() => handleSave(false)}>
            <Save size={20}/> Simpan Data
          </button>
          <button className="btn-premium btn-primary" onClick={() => handleSave(true)} disabled={isPrinting}>
            <PrinterIcon size={20}/> {isPrinting ? 'Mencetak...' : 'Simpan & Cetak'}
          </button>
        </div>
      </section>

      {/* 3. SETTINGS TOGGLE */}
      <button 
        className="btn-premium btn-ghost mb-3" 
        onClick={() => setShowSettings(!showSettings)}
      >
        <SettingsIcon size={18} /> {showSettings ? 'Sembunyikan Pengaturan' : 'Pengaturan Koneksi'}
      </button>

      {showSettings && (
        <div className="animate-fade-in">
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
        </div>
      )}

      {/* 4. HISTORY SECTION */}
      <section className="glass-card">
        <h3 className="h6 mb-3 d-flex align-items-center fw-bold">
          <Clock size={18} className="me-2 text-primary"/> Riwayat Transaksi
        </h3>
        <div className="data-table-container">
          <table className="data-table">
            <tbody>
              {logs.length > 0 ? (
                logs.map(log => (
                  <tr key={log.id}>
                    <td>
                      <div className="fw-bold">{log.product_name}</div>
                      <div className="small text-muted">{log.client_name}</div>
                    </td>
                    <td className="text-end">
                      <div className="fw-bold text-success">{log.gross_weight} {log.unit_used}</div>
                      <div className="small text-muted">{log.created_at?.split(' ')[1] || log.created_at}</div>
                    </td>
                    <td style={{ width: '40px' }} className="text-center">
                      <Trash2 
                        size={18} 
                        className="text-danger cursor-pointer" 
                        style={{ cursor: 'pointer' }}
                        onClick={() => handleDelete(log.id)}
                      />
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td className="text-center text-muted">Belum ada data.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* FOOTER STATUS BAR */}
      <div className="status-bar">
        <div className="status-badge">
          <Activity size={12} />
          <span>MODE: {saveMode?.toUpperCase()}</span>
        </div>
        <div className="status-badge">
          <DbIcon size={12} />
          <span>{dbMethod}: {dbReady ? 'READY' : 'WAIT'}</span>
        </div>
      </div>
    </div>
  );
}

export default App;