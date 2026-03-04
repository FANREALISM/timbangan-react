import React from 'react';

function ScalesDisplay({ weight, unit, status, isConnected }) {
  // Logika warna status
  const statusColor = isConnected ? '#2ECC71' : '#F44336';

  return (
    <div className="card border-0 shadow-sm mb-4" 
         style={{ 
           background: '#1a1a1a', // Background gelap seperti layar LED
           borderRadius: '20px', 
           padding: '30px',
           position: 'relative',
           overflow: 'hidden'
         }}>
      
      {/* Label Status di Pojok Kiri Atas */}
      <div style={{ 
        position: 'absolute', 
        top: '15px', 
        left: '20px', 
        display: 'flex', 
        alignItems: 'center',
        gap: '8px'
      }}>
        <div style={{ 
          width: '10px', 
          height: '10px', 
          borderRadius: '50%', 
          backgroundColor: statusColor,
          boxShadow: `0 0 10px ${statusColor}` 
        }}></div>
        <span style={{ color: '#888', fontSize: '12px', fontWeight: '600' }}>
          {status.toUpperCase()}
        </span>
      </div>

      {/* ANGKA TIMBANGAN UTAMA */}
      <div className="d-flex justify-content-center align-items-baseline" style={{ marginTop: '20px' }}>
        <h1 style={{ 
          fontFamily: "'Orbitron', sans-serif", // Font Digital
          fontSize: '85px', 
          fontWeight: '900', 
          color: '#00ff41', // Hijau Matrix/LED
          margin: 0,
          letterSpacing: '5px',
          textShadow: '0 0 20px rgba(0, 255, 65, 0.5)' // Efek cahaya LED
        }}>
          {weight || "0.00"}
        </h1>
        <span style={{ 
          fontFamily: "'Orbitron', sans-serif",
          fontSize: '28px', 
          color: '#00ff41', 
          marginLeft: '15px',
          opacity: 0.8
        }}>
          {unit || "kg"}
        </span>
      </div>

      {/* Grid Pattern Background (Opsional untuk efek layar) */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))',
        backgroundSize: '100% 4px, 3px 100%',
        pointerEvents: 'none'
      }}></div>
    </div>
  );
}

export default ScalesDisplay;