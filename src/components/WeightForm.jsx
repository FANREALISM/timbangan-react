import React from 'react';
import { Save, Printer } from 'lucide-react';

function WeightForm({ 
  productName, 
  setProductName, 
  clientName, 
  setClientName, 
  handleSave, 
  isOnline,
  isPrinting
}) {
  return (
    <div className="card panel">
      <h3>Informasi Timbangan</h3>
      <input
        placeholder="Nama Barang"
        value={productName}
        onChange={e => setProductName(e.target.value)}
      />
      <input
        placeholder="Nama Customer"
        value={clientName}
        onChange={e => setClientName(e.target.value)}
      />
      <div className="button-group-vertical" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <button
          className="btn save"
          onClick={() => handleSave(false)}
          disabled={!isOnline}
        >
          <Save size={16}/> Simpan ke Database
        </button>
        <button
          className="btn print"
          onClick={() => handleSave(true)}
          disabled={!isOnline || isPrinting}
        >
          <Printer size={16}/> {isPrinting ? "Mencetak..." : "Simpan & Cetak"}
        </button>
      </div>
    </div>
  );
}

export default WeightForm;
