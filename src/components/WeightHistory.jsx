import React from 'react';
import { History } from 'lucide-react';

function WeightHistory({ logs }) {
  return (
    <div className="card history mt-3 shadow-sm mx-2 border-0" style={{ borderRadius: '15px', padding: '15px' }}>
      <h3 className="h6 mb-3 d-flex align-items-center fw-bold text-dark">
        <History size={18} className="me-2"/> Riwayat Terakhir
      </h3>
      <div className="table-responsive">
        <table className="table table-sm table-borderless align-middle mb-0 text-start">
          <thead className="text-muted small border-bottom">
            <tr>
              <th className="py-2">Waktu</th>
              <th className="py-2">Barang</th>
              <th className="py-2">Client</th>
              <th className="py-2 text-end">Berat</th>
            </tr>
          </thead>
          <tbody>
            {logs && logs.length > 0 ? (
              logs.map((l) => (
                <tr key={l.id} className="border-bottom-light">
                  <td className="py-2 small">
                    {l.created_at ? l.created_at.split(' ')[1] : '-'}
                  </td>
                  <td className="py-2">{l.product_name || '-'}</td>
                  <td className="py-2">{l.client_name || '-'}</td>
                  <td className="py-2 text-end fw-bold">
                    {l.gross_weight ?? '0'} {l.unit_used || 'g'}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="text-center py-4 text-muted">Belum ada data</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default WeightHistory;