import { Capacitor } from "@capacitor/core";

export const isElectron = !!(window && window.process && window.process.type);

export const isCapacitor = () => {
  return typeof Capacitor !== "undefined" && Capacitor.isNativePlatform();
};

export const isPWA = () => {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone ||
    false
  );
};

export const getPlatform = () => {
  if (isElectron) return "electron";
  if (isCapacitor()) return "capacitor";
  if (isPWA()) return "pwa";
  return "web";
};

export const getApiUrl = (path, serverIp = "192.168.1.100") => {
  if (isCapacitor()) {
    return `http://${serverIp}:5000${path}`;
  }
  return path;
};
