const { contextBridge, ipcRenderer } = require("electron");
const { versions } = process;

window.addEventListener("DOMContentLoaded", () => {
  console.log(`Electron  : ${versions.electron}`);
  console.log(`Node.js   : ${versions.node}`);
  console.log(`Chrome    : ${versions.chrome}`);
});

contextBridge.exposeInMainWorld("printerAPI", {
  listUSBPrinters: () => ipcRenderer.invoke("printer:list-usb"),
  listSerialPorts: () => ipcRenderer.invoke("printer:list-serial"),
  print: (options) => ipcRenderer.invoke("printer:print", options),
  onShowSerialPicker: (callback) =>
    ipcRenderer.on("serial:show-picker", (v, list) => callback(list)),
  chooseSerialPort: (portId) => ipcRenderer.send("serial:choose-port", portId),
});
