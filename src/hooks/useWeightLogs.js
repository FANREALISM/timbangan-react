import { useState, useEffect, useCallback } from "react";
import { dbService } from "../utils/dbService";

/**
 * Hook to handle weight logs API operations
 */
export const useWeightLogs = () => {
  const [logs, setLogs] = useState([]);

  const fetchLogs = useCallback(async () => {
    try {
      const result = await dbService.getLogs();
      if (result.status === "success") setLogs(result.data);
    } catch (e) {
      console.warn("Gagal mengambil data dari database:", e.message);
    }
  }, []);

  const saveWeight = useCallback(
    async ({ product, client, weight, unit }) => {
      if (!product) {
        alert("Nama produk wajib diisi!");
        return false;
      }

      try {
        const result = await dbService.saveWeight({
          product,
          client,
          weight,
          unit,
        });
        if (result.status === "success") {
          alert("Data berhasil disimpan!");
          await fetchLogs();
          return true;
        }
        alert("Gagal menyimpan: " + (result.message || "Status bukan success"));
        return false;
      } catch (e) {
        alert("Gagal terhubung ke database: " + e.message);
        return false;
      }
    },
    [fetchLogs],
  );

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 15000);
    return () => clearInterval(interval);
  }, [fetchLogs]);

  return { logs, fetchLogs, saveWeight };
};
