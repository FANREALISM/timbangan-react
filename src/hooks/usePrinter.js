import { useState, useCallback, useRef } from "react";
import { getPlatform } from "../utils/platform";
import { EscPosEncoder } from "../utils/escpos-encoder";
import { TsplEncoder, ZplEncoder } from "../utils/printer-encoders";
import { registerPlugin } from "@capacitor/core";

const CustomHardware = registerPlugin("CustomHardware");

export const usePrinter = (defaultType = "escpos") => {
  const [printerStatus, setPrinterStatus] = useState("Disconnected");
  const [isPrinting, setIsPrinting] = useState(false);
  const activePort = useRef(null);
  const platform = getPlatform();

  const connectPrinter = useCallback(
    async (options = {}) => {
      if (platform === "capacitor") {
        try {
          setPrinterStatus("Connecting Bluetooth Printer...");

          const params = options.macAddress
            ? { macAddress: options.macAddress }
            : {};
          await CustomHardware.connectBluetooth(params);
          setPrinterStatus("Connected (BT Printer)");
          activePort.current = { type: "bluetooth" };
        } catch (err) {
          alert("Gagal terhubung printer: " + (err.message || err));
          setPrinterStatus("Disconnected");
        }
      } else {
        // Existing Web/Electron logic
        let serial = navigator.serial;
        if (!serial && "usb" in navigator) {
          const { serial: polyfill } = await import("web-serial-polyfill");
          serial = polyfill;
        }
        if (!serial) return;
        try {
          const port = await serial.requestPort();
          await port.open({ baudRate: 9600 });
          activePort.current = port;
          setPrinterStatus("Connected (Serial)");
        } catch (err) {
          setPrinterStatus("Error");
        }
      }
    },
    [platform],
  );

  const disconnectPrinter = useCallback(async () => {
    if (activePort.current) {
      if (platform === "capacitor" && activePort.current.type === "bluetooth") {
        try {
          await CustomHardware.disconnect();
        } catch (e) {}
      } else if (activePort.current.close) {
        await activePort.current.close();
      }
      activePort.current = null;
    }
    setPrinterStatus("Disconnected");
  }, [platform]);

  const print = useCallback(
    async (data, overrideType = null) => {
      const type = overrideType || defaultType;
      setIsPrinting(true);
      try {
        let bytes;
        if (type === "tspl") {
          const encoder = new TsplEncoder();
          encoder.initialize();
          encoder.text(10, 10, data.title || "LABEL");
          data.details?.forEach((line, i) =>
            encoder.text(10, 50 + i * 30, line),
          );
          bytes = encoder.print();
        } else if (type === "zpl") {
          const encoder = new ZplEncoder();
          encoder.text(50, 50, data.title || "LABEL");
          data.details?.forEach((line, i) =>
            encoder.text(50, 100 + i * 40, line),
          );
          bytes = encoder.print();
        } else {
          const encoder = new EscPosEncoder();
          bytes = encoder
            .initialize()
            .align(1)
            .text(data.title || "RECEIPT")
            .line(2)
            .align(0)
            .text(data.details?.join("\n") || "")
            .line(4)
            .cut()
            .encode();
        }

        if (
          activePort.current?.type === "bluetooth" &&
          platform === "capacitor"
        ) {
          try {
            // Encode uint8array bytes to base64 string for the plugin call
            const base64Data = btoa(String.fromCharCode.apply(null, bytes));
            await CustomHardware.write({ data: base64Data });
          } catch (e) {
            throw new Error("Gagal kirim ke BT: " + e.message);
          }
        } else if (activePort.current?.writable) {
          const writer = activePort.current.writable.getWriter();
          await writer.write(bytes);
          writer.releaseLock();
        } else {
          alert("Printer tidak terhubung.");
        }
      } catch (err) {
        console.error("Print Error:", err);
        alert("Gagal mencetak: " + err.message);
      } finally {
        setIsPrinting(false);
      }
    },
    [defaultType],
  );

  return {
    printerStatus,
    connectPrinter,
    disconnectPrinter,
    printReceipt: print,
    isPrinting,
  };
};
