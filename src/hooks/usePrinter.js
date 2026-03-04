import { useState, useCallback, useRef } from "react";
import { isElectron, getPlatform } from "../utils/platform";

export const usePrinter = () => {
  const [printerStatus, setPrinterStatus] = useState("Disconnected");
  const [isPrinting, setIsPrinting] = useState(false);
  const activePort = useRef(null);

  const connectPrinter = useCallback(async () => {
    const platform = getPlatform();
    
    if (platform === "electron") {
      // Logic untuk desktop
      setPrinterStatus("Connected (Desktop)");
    } else if ("serial" in navigator) {
      try {
        const port = await navigator.serial.requestPort();
        await port.open({ baudRate: 9600 });
        activePort.current = port;
        setPrinterStatus("Connected (USB)");
      } catch (err) {
        setPrinterStatus("Error");
      }
    } else {
      alert("Browser tidak mendukung Web Serial untuk Printer.");
    }
  }, []);

  const disconnectPrinter = useCallback(async () => {
    if (activePort.current) {
      await activePort.current.close();
      activePort.current = null;
    }
    setPrinterStatus("Disconnected");
  }, []);

  const printReceipt = useCallback(async (data) => {
    setIsPrinting(true);
    // Logic print di sini...
    setTimeout(() => setIsPrinting(false), 1000);
  }, []);

  return { printerStatus, connectPrinter, disconnectPrinter, printReceipt, isPrinting };
};