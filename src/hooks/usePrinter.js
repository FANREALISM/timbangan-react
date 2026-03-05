import { useState, useCallback, useRef } from "react";
import { getPlatform } from "../utils/platform";
import { EscPosEncoder } from "../utils/escpos-encoder";

export const usePrinter = () => {
  const [printerStatus, setPrinterStatus] = useState("Disconnected");
  const [isPrinting, setIsPrinting] = useState(false);
  const activePort = useRef(null);
  const platform = getPlatform();

  // Connect for PWA/Web (Web Serial)
  const connectWebSerial = useCallback(async () => {
    let serial = navigator.serial;
    if (!serial && "usb" in navigator) {
      const { serial: polyfill } = await import("web-serial-polyfill");
      serial = polyfill;
    }

    if (!serial) {
      alert(
        "Browser tidak mendukung Web Serial/USB. Gunakan Chrome atau Edge.",
      );
      return;
    }
    try {
      const port = await serial.requestPort();
      await port.open({ baudRate: 9600 });
      activePort.current = port;
      setPrinterStatus("Connected (Web Serial)");
    } catch (err) {
      console.error("Web Serial Error:", err);
      setPrinterStatus("Error");
    }
  }, []);

  // Connect for Electron (Lists available ports via IPC)
  const connectElectron = useCallback(async () => {
    try {
      setPrinterStatus("Connecting (Desktop)...");
      // Electron usually manages ports in main process, here we just update status
      setPrinterStatus("Connected (Desktop)");
    } catch (err) {
      setPrinterStatus("Error");
    }
  }, []);

  const connectPrinter = useCallback(async () => {
    if (platform === "electron") {
      await connectElectron();
    } else if (platform === "capacitor") {
      // Connect to Bluetooth Printer for Android
      if (!window.bluetoothSerial) {
        alert("Plugin Bluetooth tidak tersedia.");
        return;
      }
      return new Promise((resolve) => {
        window.bluetoothSerial.list(
          (devices) => {
            if (devices.length === 0) {
              alert("Tidak ada printer Bluetooth ditemukan.");
              return resolve();
            }
            // Assuming the user picks the first paired device for now
            const device = devices[0];
            setPrinterStatus(`Connecting to ${device.name}...`);
            window.bluetoothSerial.connect(
              device.id,
              () => {
                setPrinterStatus(`Connected (BT Printer: ${device.name})`);
                activePort.current = { type: "bluetooth", id: device.id };
                resolve();
              },
              (err) => {
                alert("Gagal terhubung printer: " + err);
                setPrinterStatus("Disconnected");
                resolve();
              },
            );
          },
          () => resolve(),
        );
      });
    } else {
      await connectWebSerial();
    }
  }, [platform, connectElectron, connectWebSerial]);

  const disconnectPrinter = useCallback(async () => {
    if (activePort.current) {
      try {
        if (activePort.current.type === "bluetooth" && window.bluetoothSerial) {
          window.bluetoothSerial.disconnect();
        } else if (activePort.current.close) {
          await activePort.current.close();
        }
      } catch (e) {
        console.warn("Error closing port:", e);
      }
      activePort.current = null;
    }
    setPrinterStatus("Disconnected");
  }, []);

  const printReceipt = useCallback(
    async (content) => {
      setIsPrinting(true);
      try {
        if (platform === "electron" && window.printerAPI) {
          // Desktop uses IPC bridge
          await window.printerAPI.print({
            deviceType: "serial", // Default to serial printer on desktop
            deviceQuery: { path: "COM1", baudRate: 9600 }, // These should ideally be configurable
            content: content,
          });
        } else if (activePort.current) {
          // Web/PWA uses raw ESC/POS over Web Serial OR Capacitor uses Bluetooth Serial
          const encoder = new EscPosEncoder();
          const bytes = encoder
            .initialize()
            .align(1) // Center
            .size(1) // Double height
            .text(content.title || "RECEIPT")
            .line(2)
            .align(0) // Left
            .size(0) // Normal
            .text(content.details.join("\n"))
            .line(2)
            .align(1) // Center
            .text(content.footer || "Thank You")
            .line(4)
            .cut()
            .encode();

          if (
            activePort.current.type === "bluetooth" &&
            window.bluetoothSerial
          ) {
            // Android Bluetooth
            await new Promise((resolve, reject) => {
              window.bluetoothSerial.write(bytes, resolve, reject);
            });
          } else if (activePort.current.writable) {
            // Web Serial
            const writer = activePort.current.writable.getWriter();
            await writer.write(bytes);
            writer.releaseLock();
          }
        } else {
          alert("Printer tidak terhubung.");
        }
      } catch (err) {
        console.error("Printing Error:", err);
        alert("Gagal mencetak: " + err.message);
      } finally {
        setIsPrinting(false);
      }
    },
    [platform],
  );

  return {
    printerStatus,
    connectPrinter,
    disconnectPrinter,
    printReceipt,
    isPrinting,
  };
};
