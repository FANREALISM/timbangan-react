import React from 'react';
import { Usb, Wifi, Power, Printer, Settings } from 'lucide-react';
import { isElectron, isPWA } from '../utils/platform';

function ConnectionPanel({
  deviceIp, setDeviceIp,
  printerIp, setPrinterIp,
  scaleBaudRate, setScaleBaudRate,
  connectSerial, connectWS, disconnectWS,
  connectPrinter, disconnectPrinter,
  printerStatus,
  manualPort, setManualPort // Tambahkan jika Anda menggunakan state ini di App.jsx
}) {
  const [showManual, setShowManual] = React.useState(false);
  
  // Cek apakah browser mendukung Web Serial (untuk PWA di Android)
  const supportsSerial = 'serial' in navigator || isElectron;

  return (
    <div className="panel-container px-2 w-100"> 
      
      {/* SEKSI KONFIGURASI ALAT (TIMBANGAN) */}
      <div className="card shadow-sm mb-3 border-0" 
           style={{ borderRadius: '15px', padding: '18px', background: '#fff', position: 'relative' }}>
        
        <div className="d-flex align-items-center mb-3">
          <h3 className="h6 mb-0 fw-bold text-dark text-start">Konfigurasi Alat</h3>
          
          {/* Status Badge */}
          <span className="badge" 
            style={{ 
              backgroundColor: printerStatus === 'Connected' ? '#2ecc71' : '#e74c3c', 
              fontSize: '10px', 
              borderRadius: '50px', 
              padding: '6px 14px',
              position: 'absolute',
              right: '18px'
            }}>
            Printer: {printerStatus}
          </span>
        </div>

        <div className="row g-2 mb-3">
          <div className="col-7 text-start">
            <label className="small text-muted mb-1 d-block">IP Alat (WiFi/WS)</label>
            <input 
              type="text" 
              className="form-control bg-light border-0 shadow-none" 
              value={deviceIp} 
              onChange={(e) => setDeviceIp(e.target.value)} 
              placeholder="192.168.1.100"
              style={{ borderRadius: '8px', height: '45px' }}
            />
          </div>
          <div className="col-5 text-start">
            <label className="small text-muted mb-1 d-block">Baud Rate</label>
            <select 
              className="form-select bg-light border-0 shadow-none" 
              value={scaleBaudRate} 
              onChange={(e) => setScaleBaudRate(e.target.value)}
              style={{ borderRadius: '8px', height: '45px', fontSize: '14px' }}
            >
              <option value="4800">4800</option>
              <option value="9600">9600</option>
              <option value="19200">19200</option>
              <option value="38400">38400</option>
              <option value="115200">115200</option>
            </select>
          </div>
        </div>

        {/* Tombol Koneksi Alat */}
        <div className="d-grid gap-2">
          <div className="d-flex gap-2">
            {supportsSerial && (
              <button className="btn flex-grow-1 py-2 fw-bold text-white d-flex align-items-center justify-content-center border-0" 
                      style={{ backgroundColor: '#2196F3', borderRadius: '12px', height: '50px' }} onClick={connectSerial}>
                <Usb size={20} className="me-2"/> Serial/USB
              </button>
            )}
            <button className="btn flex-grow-1 py-2 fw-bold text-white d-flex align-items-center justify-content-center border-0" 
                    style={{ backgroundColor: '#4CAF50', borderRadius: '12px', height: '50px' }} onClick={() => connectWS(deviceIp)}>
              <Wifi size={20} className="me-2"/> WiFi
            </button>
          </div>
          <button className="btn w-100 py-0 fw-bold text-white d-flex align-items-center justify-content-center border-0" 
                  style={{ backgroundColor: '#F44336', borderRadius: '12px', height: '45px' }} onClick={disconnectWS}>
            <Power size={18} className="me-2"/> Putuskan Alat
          </button>
        </div>
      </div>

      {/* SEKSI KONFIGURASI PRINTER */}
      <div className="card shadow-sm mb-3 border-0" style={{ borderRadius: '15px', padding: '18px', background: '#fff' }}>
        <h3 className="h6 mb-3 fw-bold text-start text-dark">Konfigurasi Printer</h3>
        
        {/* Fitur Manual Port hanya untuk Electron atau Troubleshooting */}
        {(isElectron || isPWA) && (
          <div className="mb-2 text-start">
             <div className="form-check form-switch mb-2">
                <input className="form-check-input" type="checkbox" checked={showManual} onChange={e => setShowManual(e.target.checked)} id="manualMode" />
                <label className="form-check-label small text-muted" htmlFor="manualMode">Mode Manual Port</label>
             </div>
             {showManual && (
                <input 
                  type="text" 
                  className="form-control mb-2 bg-light border-0 shadow-none" 
                  value={manualPort} 
                  onChange={(e) => setManualPort(e.target.value)} 
                  placeholder="Contoh: COM1 atau /dev/ttyUSB0"
                  style={{ borderRadius: '8px', fontSize: '13px' }}
                />
             )}
          </div>
        )}

        <div className="mb-3 text-start">
          <label className="small text-muted mb-1 d-block">IP Printer (Network)</label>
          <input 
            type="text" 
            className="form-control bg-light border-0 shadow-none" 
            value={printerIp} 
            onChange={(e) => setPrinterIp(e.target.value)} 
            placeholder="192.168.1.101" 
            style={{ borderRadius: '8px', height: '45px' }}
          />
        </div>

        <div className="d-flex gap-2">
          <button className="btn flex-grow-1 py-0 fw-bold text-white d-flex align-items-center justify-content-center border-0" 
                  style={{ backgroundColor: '#673AB7', borderRadius: '12px', height: '50px' }} 
                  onClick={connectPrinter}
                  disabled={printerStatus === 'Connected'}>
            <Printer size={20} className="me-2"/> Hubungkan
          </button>
          <button className="btn py-0 fw-bold text-white d-flex align-items-center justify-content-center border-0" 
                  style={{ backgroundColor: '#9E9E9E', borderRadius: '12px', width: '60px', height: '50px' }} 
                  onClick={disconnectPrinter}>
            <Power size={20}/>
          </button>
        </div>
      </div>

      <p className="text-center text-muted mb-4" style={{ fontSize: '11px', fontStyle: 'italic' }}>
        *Gunakan Chrome di Android untuk fitur USB OTG.
      </p>
    </div>
  );
}

export default ConnectionPanel;