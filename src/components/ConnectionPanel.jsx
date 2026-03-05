import React from 'react';
import { Usb, Wifi, Power, Printer, Settings } from 'lucide-react';
import { isElectron, isCapacitor } from '../utils/platform';

function ConnectionPanel({
  deviceIp, setDeviceIp,
  printerIp, setPrinterIp,
  scaleBaudRate, setScaleBaudRate,
  connectSerial, connectWS, disconnectWS,
  connectPrinter, disconnectPrinter,
  printerStatus,
  manualPort, setManualPort
}) {
  const supportsSerial = 'serial' in navigator || 'usb' in navigator || isCapacitor();
  const isWeb = !isCapacitor() && !isElectron;

  return (
    <div className="connection-panel"> 
      
      {/* 1. SCALE CONFIG */}
      <div className="glass-card mb-3">
        <div className="d-flex align-items-center justify-content-between mb-3">
          <h3 className="h6 mb-0 fw-bold d-flex align-items-center">
            <Settings size={18} className="me-2 text-primary"/> Konfigurasi Alat
          </h3>
          <span className={`badge ${printerStatus.includes('Connected') ? 'bg-success' : 'bg-secondary'}`} 
            style={{ fontSize: '10px', borderRadius: '50px' }}>
            Printer: {printerStatus}
          </span>
        </div>

        {isWeb && !('serial' in navigator) && !('usb' in navigator) && (
          <div className="alert alert-warning py-2 mb-3" style={{ fontSize: '11px', borderRadius: '12px', border: 'none', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
            ⚠️ Browser ini tidak mendukung USB/Serial. Gunakan <b>Chrome</b> atau <b>Edge</b>.
          </div>
        )}

        <div className="row g-2 mb-3">
          <div className="col-12 col-md-7">
            <div className="form-group">
              <label>IP Alat (WiFi/WS)</label>
              <input 
                type="text" 
                className="premium-input" 
                value={deviceIp} 
                onChange={(e) => setDeviceIp(e.target.value)} 
                placeholder="192.168.1.100"
              />
            </div>
          </div>
          <div className="col-12 col-md-5">
            <div className="form-group">
              <label>Baud Rate</label>
              <select 
                className="premium-input" 
                value={scaleBaudRate} 
                onChange={(e) => setScaleBaudRate(e.target.value)}
              >
                <option value="4800">4800</option>
                <option value="9600">9600</option>
                <option value="19200">19200</option>
                <option value="38400">38400</option>
                <option value="115200">115200</option>
              </select>
            </div>
          </div>
        </div>

        <div className="d-grid gap-2">
          <div className="d-flex gap-2">
            <button 
              className={`btn-premium btn-primary flex-grow-1 ${!supportsSerial ? 'opacity-50' : ''}`} 
              onClick={connectSerial}
              disabled={!supportsSerial && !isCapacitor()}
            >
              <Usb size={18} className="me-2"/> Serial/USB
            </button>
            <button className="btn-premium btn-success flex-grow-1" onClick={() => connectWS(deviceIp)}>
              <Wifi size={18} className="me-2"/> WiFi
            </button>
          </div>
          <button className="btn-premium btn-danger btn-sm py-2" onClick={disconnectWS} style={{ fontSize: '13px' }}>
            <Power size={16} className="me-2"/> Putuskan Alat
          </button>
        </div>
      </div>

      {/* 2. PRINTER CONFIG */}
      <div className="glass-card mb-3">
        <h3 className="h6 mb-3 fw-bold d-flex align-items-center">
          <Printer size={18} className="me-2 text-primary"/> Konfigurasi Printer
        </h3>
        
        <div className="form-group mb-3">
          <label>IP Printer (Network)</label>
          <input 
            type="text" 
            className="premium-input" 
            value={printerIp} 
            onChange={(e) => setPrinterIp(e.target.value)} 
            placeholder="192.168.1.101" 
          />
        </div>

        <div className="d-flex gap-2">
          <button className={`btn-premium btn-primary flex-grow-1 ${isWeb && !('serial' in navigator) ? 'opacity-50' : ''}`}
                  onClick={connectPrinter}
                  disabled={printerStatus.includes('Connected')}>
            <Printer size={18} className="me-2"/> Hubungkan
          </button>
          <button className="btn-premium btn-ghost" 
                  style={{ width: '60px' }}
                  onClick={disconnectPrinter}>
            <Power size={18}/>
          </button>
        </div>
      </div>

      <p className="text-center text-muted small" style={{ fontStyle: 'italic' }}>
        *Gunakan Bluetooth untuk perangkat Android.
      </p>
    </div>
  );
}

export default ConnectionPanel;
