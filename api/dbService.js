import { getPlatform } from "./platform";

// GANTI dengan IP Laptop Anda agar HP bisa akses
const SERVER_IP = "192.168.1.100"; 
const API_URL = `/api`;

// Export initDB supaya main.jsx tidak error saat build
export const initDB = async () => {
  console.log("Database service initialized");
  return true;
};

export const dbService = {
  getLogs: async () => {
    try {
      const response = await fetch(`${API_URL}/logs`);
      return await response.json();
    } catch (err) {
      console.error("Fetch Logs Error:", err);
      return { status: "error", data: [] };
    }
  },

  saveWeight: async (data) => {
    try {
      const response = await fetch(`${API_URL}/weight`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return await response.json();
    } catch (err) {
      console.error("Save Weight Error:", err);
      return { status: "error", message: "Gagal terhubung ke server" };
    }
  },
};