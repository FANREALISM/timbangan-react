import { useState, useRef, useCallback } from "react";
import { isCapacitor } from "../utils/platform";

export const useSerialScale = (onDataReceived) => {
  const [status, setStatus] = useState("Disconnected");
  const portRef = useRef(null);
  const readerRef = useRef(null);
  const isConnecting = useRef(false);

  const connectSerial = async (baudRate = 9600, options = {}) => {
    if (isConnecting.current) return;
    isConnecting.current = true;

    // Jika di Android/Capacitor
    if (isCapacitor()) {
      const type = options.type || "usb"; // 'usb' or 'bluetooth'

      if (type === "bluetooth") {
        return handleBluetoothConnection(onDataReceived);
      } else {
        return handleUsbConnection(baudRate, onDataReceived);
      }
    }

    // Web Serial / Electron logic remains the same
    return handleWebSerialConnection(baudRate, onDataReceived);
  };

  const handleBluetoothConnection = async (callback) => {
    try {
      setStatus("Connecting Bluetooth...");
      isConnecting.current = true;

      const { CustomHardware } = Capacitor.Plugins;

      // We add listener before connecting to not miss early data
      await CustomHardware.addListener("onDataReceived", (info) => {
        if (info.data) callback(info.data);
      });

      const result = await CustomHardware.connectBluetooth({});
      if (result.status === "connected") {
        setStatus("Connected (BT)");
      }
      isConnecting.current = false;
    } catch (err) {
      console.error("BT Connect Error:", err);
      setStatus("Disconnected");
      isConnecting.current = false;
      alert("Gagal terhubung Bluetooth: " + (err.message || err));
    }
  };

  const handleUsbConnection = async (baudRate, callback) => {
    try {
      setStatus("Connecting USB OTG...");
      isConnecting.current = true;

      const { CustomHardware } = Capacitor.Plugins;

      await CustomHardware.addListener("onDataReceived", (info) => {
        if (info.data) callback(info.data);
      });

      const result = await CustomHardware.connectUsb({
        baudRate: Number(baudRate),
      });
      if (result.status === "connected") {
        setStatus("Connected (USB OTG)");
      }
      isConnecting.current = false;
    } catch (err) {
      console.error("USB Connect Error:", err);
      setStatus("Disconnected");
      isConnecting.current = false;
      alert("Gagal terhubung USB: " + (err.message || err));
    }
  };

  const handleWebSerialConnection = async (baudRate, callback) => {
    let serial = navigator.serial;
    if (!serial && "usb" in navigator) {
      const { serial: polyfill } = await import("web-serial-polyfill");
      serial = polyfill;
    }

    if (!serial) {
      alert("Browser/Perangkat tidak mendukung Serial Port.");
      isConnecting.current = false;
      return;
    }

    try {
      const port = await serial.requestPort();
      await port.open({ baudRate: Number(baudRate) });
      portRef.current = port;
      setStatus(`Connected (${baudRate})`);
      isConnecting.current = false;

      const decoder = new TextDecoder();
      while (port.readable) {
        const reader = port.readable.getReader();
        readerRef.current = reader;
        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            callback(decoder.decode(value));
          }
        } finally {
          reader.releaseLock();
        }
      }
    } catch (err) {
      console.error(err);
      setStatus("Disconnected");
      isConnecting.current = false;
    }
  };

  const disconnectSerial = async () => {
    if (isCapacitor()) {
      try {
        const { CustomHardware } = Capacitor.Plugins;
        await CustomHardware.disconnect();
        CustomHardware.removeAllListeners();
      } catch (e) {
        console.error("Disconnect error", e);
      }
    } else {
      if (readerRef.current) await readerRef.current.cancel();
      if (portRef.current) await portRef.current.close();
    }
    setStatus("Disconnected");
  };

  return { connectSerial, disconnectSerial, status };
};
