export const isElectron = !!(window && window.process && window.process.type);

export const isCapacitor = () => {
  return !!(window && window.Capacitor && window.Capacitor.isNative);
};

export const isPWA = () => {
  return window.matchMedia('(display-mode: standalone)').matches || 
         window.navigator.standalone || 
         false;
};

export const getPlatform = () => {
  if (isElectron) return "electron";
  if (isCapacitor()) return "capacitor";
  if (isPWA()) return "pwa";
  return "web";
};