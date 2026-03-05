import { useState, useRef } from "react";
import { isCapacitor } from "../utils/platform";

export const useSerialScale = (onDataReceived) => {
  const [status, setStatus] = useState("Disconnected");
  const portRef = useRef(null);
  const readerRef = useRef(null);

  const connectSerial = async (baudRate = 9600) => {
    // Jika di Android/Capacitor menggunakan plugin Bluetooth
    if (isCapacitor()) {
      return new Promise((resolve, reject) => {
        if (!window.bluetoothSerial) {
          alert("Plugin Bluetooth tidak tersedia.");
          return reject("Plugin missing");
        }

        window.bluetoothSerial.list(
          (devices) => {
            if (devices.length === 0) {
              alert("Tidak ada perangkat Bluetooth ditemukan.");
              return reject("No devices");
            }

            // Simple selection for now, improved UI can handle this better
            const device = devices[0];
            setStatus(`Connecting to ${device.name}...`);

            window.bluetoothSerial.connect(
              device.id,
              () => {
                setStatus(`Connected (BT: ${device.name})`);
                window.bluetoothSerial.subscribe(
                  "\n",
                  (data) => {
                    onDataReceived(data);
                  },
                  (err) => console.error("BT Subscribe Error:", err),
                );
                resolve();
              },
              (err) => {
                console.error("BT Connect Error:", err);
                setStatus("Disconnected");
                alert("Gagal terhubung ke Bluetooth: " + err);
                reject(err);
              },
            );
          },
          (err) => {
            console.error("BT List Error:", err);
            reject(err);
          },
        );
      });
    }

    // Jika di PWA/Web/Electron menggunakan Web Serial API
    let serial = navigator.serial;

    // Fallback to WebUSB Polyfill if native Serial is missing
    if (!serial && "usb" in navigator) {
      console.log("Web Serial not supported, using WebUSB Polyfill...");
      const { serial: polyfill } = await import("web-serial-polyfill");
      serial = polyfill;
    }

    if (!serial) {
      alert("Browser/Perangkat tidak mendukung Serial Port atau WebUSB.");
      return;
    }

    try {
      const port = await serial.requestPort();
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
    if (isCapacitor() && window.bluetoothSerial) {
      window.bluetoothSerial.disconnect();
    } else {
      if (readerRef.current) await readerRef.current.cancel();
      if (portRef.current) await portRef.current.close();
    }
    setStatus("Disconnected");
  };

  return { connectSerial, disconnectSerial, status };
};
