import React from 'react';
import { Usb, Wifi, Power, Printer, Settings } from 'lucide-react';
import { isElectron, isCapacitor } from '../utils/platform';

function ConnectionPanel({
  deviceIp, setDeviceIp,
  printerIp, setPrinterIp,
  scaleBaudRate, setScaleBaudRate,
  printerType, setPrinterType,
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
          {isCapacitor() ? (
            <div className="connection-selector mb-2">
              <label className="small text-muted mb-1">Metode Koneksi</label>
              <div className="d-flex gap-2">
                <button 
                  className={`btn-premium flex-grow-1 ${manualPort === 'usb' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setManualPort('usb')}
                  style={{ fontSize: '12px', padding: '8px' }}
                >
                  <Usb size={16} className="me-1"/> USB OTG
                </button>
                <button 
                  className={`btn-premium flex-grow-1 ${manualPort === 'bluetooth' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setManualPort('bluetooth')}
                  style={{ fontSize: '12px', padding: '8px' }}
                >
                  <Wifi size={16} className="me-1"/> Bluetooth
                </button>
                <button 
                  className={`btn-premium flex-grow-1 ${manualPort === 'wifi' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setManualPort('wifi')}
                  style={{ fontSize: '12px', padding: '8px' }}
                >
                  <Wifi size={16} className="me-1"/> WiFi
                </button>
              </div>
            </div>
          ) : null}

          {isCapacitor() ? (
            <div className="d-flex gap-2">
              {manualPort === 'wifi' ? (
                <div className="d-flex gap-2 w-100">
                  <button className="btn-premium btn-success flex-grow-1" onClick={() => connectWS(deviceIp)}>
                    <Wifi size={18} className="me-2"/> Hubungkan WiFi
                  </button>
                  <button className="btn-premium btn-danger btn-sm py-2" onClick={disconnectWS} style={{ fontSize: '13px' }}>
                    <Power size={16}/>
                  </button>
                </div>
              ) : (
                <button 
                  className="btn-premium btn-primary w-100"
                  onClick={() => connectSerial(scaleBaudRate, { type: manualPort })}
                >
                  <Usb size={18} className="me-2"/> Hubungkan {manualPort === 'usb' ? 'USB' : 'Bluetooth'}
                </button>
              )}
            </div>
          ) : (
            <>
              <button 
                className={`btn-premium btn-primary ${!supportsSerial ? 'opacity-50' : ''}`} 
                onClick={() => connectSerial(scaleBaudRate)}
                disabled={!supportsSerial}
              >
                <Usb size={18} className="me-2"/> Serial/USB
              </button>
              <div className="d-flex gap-2">
                <button className="btn-premium btn-success flex-grow-1" onClick={() => connectWS(deviceIp)}>
                  <Wifi size={18} className="me-2"/> WiFi
                </button>
                <button className="btn-premium btn-danger btn-sm py-2" onClick={disconnectWS} style={{ fontSize: '13px' }}>
                  <Power size={16} className="me-2"/> Off
                </button>
              </div>
            </>
          )}
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

        <div className="form-group mb-3">
          <label>Protokol Printer</label>
          <select 
            className="premium-input" 
            value={printerType} 
            onChange={(e) => setPrinterType(e.target.value)}
          >
            <option value="escpos">ESC/POS (Thermal Receipt)</option>
            <option value="tspl">TSPL (TSC Label)</option>
            <option value="zpl">ZPL (Zebra Label)</option>
          </select>
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
