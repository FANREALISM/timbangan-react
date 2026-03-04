import { useState, useRef } from "react";
import { isCapacitor } from "../utils/platform";

export const useSerialScale = (onDataReceived) => {
  const [status, setStatus] = useState("Disconnected");
  const portRef = useRef(null);
  const readerRef = useRef(null);

  const connectSerial = async (baudRate = 9600) => {
    // Jika di Android/Capacitor menggunakan plugin Bluetooth
    if (isCapacitor()) {
      alert("Gunakan koneksi Bluetooth untuk perangkat mobile.");
      return;
    }

    // Jika di PWA/Web/Electron menggunakan Web Serial API
    if (!("serial" in navigator)) {
      alert("Browser tidak mendukung Serial Port.");
      return;
    }

    try {
      const port = await navigator.serial.requestPort();
      await port.open({ baudRate: Number(baudRate) });
      portRef.current = port;
      setStatus(`Connected (${baudRate})`);

      const decoder = new TextDecoder();
      while (port.readable) {
        const reader = port.readable.getReader();
        readerRef.current = reader;
        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            onDataReceived(decoder.decode(value));
          }
        } finally {
          reader.releaseLock();
        }
      }
    } catch (err) {
      console.error(err);
      setStatus("Disconnected");
    }
  };

  const disconnectSerial = async () => {
    if (readerRef.current) await readerRef.current.cancel();
    if (portRef.current) await portRef.current.close();
    setStatus("Disconnected");
  };

  return { connectSerial, disconnectSerial, status };
};