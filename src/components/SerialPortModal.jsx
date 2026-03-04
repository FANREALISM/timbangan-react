import React from 'react';
import { Power, Radio } from 'lucide-react';

/**
 * A consistent modal for picking Serial Ports (COM) 
 * compatible with both Scale (Web Serial) and Printer (IPC)
 */
const SerialPortModal = ({ isOpen, ports, onSelect, onClose, title = "Pilih Port Serial" }) => {
  if (!isOpen) return null;

  return (
    <div style={modalOverlayStyle}>
      <div style={modalContentStyle}>
        <div style={modalHeaderStyle}>
          <h2>{title}</h2>
          <button onClick={onClose} style={closeButtonStyle}>&times;</button>
        </div>
        
        <div style={portListStyle}>
          {ports.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
              Tidak ada port yang terdeteksi. Pastikan perangkat sudah terhubung.
            </div>
          ) : (
            ports.map((port, idx) => (
              <div 
                key={port.portId || port.path || idx} 
                className="port-item"
                onClick={() => onSelect(port)}
                style={portItemStyle}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Radio size={20} color="#2ecc71" />
                  <div>
                    <div style={{ fontWeight: 'bold' }}>{port.portName || port.path || "Unknown Port"}</div>
                    <div style={{ fontSize: '12px', opacity: 0.7 }}>
                      {port.displayName || port.manufacturer || "Generic Serial Device"}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        
        <div style={modalFooterStyle}>
          <button onClick={onClose} className="btn secondary" style={{ width: '100%' }}>
            Batal
          </button>
        </div>
      </div>
    </div>
  );
};

// Styles
const modalOverlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.7)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 9999,
  backdropFilter: 'blur(3px)',
};

const modalContentStyle = {
  backgroundColor: '#1a1a1a',
  borderRadius: '12px',
  width: '400px',
  maxWidth: '90%',
  overflow: 'hidden',
  boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
  border: '1px solid #333',
};

const modalHeaderStyle = {
  padding: '15px 20px',
  borderBottom: '1px solid #333',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const closeButtonStyle = {
  background: 'none',
  border: 'none',
  color: '#aaa',
  fontSize: '24px',
  cursor: 'pointer',
};

const portListStyle = {
  maxHeight: '300px',
  overflowY: 'auto',
  padding: '10px',
};

const portItemStyle = {
  padding: '12px 15px',
  marginBottom: '8px',
  borderRadius: '8px',
  backgroundColor: '#252525',
  cursor: 'pointer',
  transition: 'background 0.2s',
  border: '1px solid transparent',
};

const modalFooterStyle = {
  padding: '15px 20px',
  borderTop: '1px solid #333',
};

export default SerialPortModal;
