const { app, BrowserWindow, shell, ipcMain } = require("electron");
const path = require("path");
const { fork } = require("child_process");

let serverProcess = null;

function startBackend() {
  const isPackaged = app.isPackaged;
  const serverPath = isPackaged
    ? path.join(
        process.resourcesPath,
        "app.asar.unpacked",
        "server",
        "index.js",
      )
    : path.join(__dirname, "server", "index.js");

  const configPath = isPackaged
    ? path.join(process.resourcesPath, "app.asar.unpacked", "config.ini")
    : path.join(__dirname, "config.ini");

  const dbPath = isPackaged
    ? path.join(app.getPath("userData"), "timbangan.db")
    : path.join(__dirname, "timbangan.db");

  // Copy default DB to userData if it doesn't exist
  if (isPackaged && !require("fs").existsSync(dbPath)) {
    const sourceDb = path.join(
      process.resourcesPath,
      "app.asar.unpacked",
      "timbangan.db",
    );
    if (require("fs").existsSync(sourceDb)) {
      try {
        require("fs").copyFileSync(sourceDb, dbPath);
      } catch (e) {
        console.error("❌ Failed to copy default DB:", e);
      }
    }
  }

  console.log("🚀 Starting Backend Server:", serverPath);

  serverProcess = fork(serverPath, [], {
    env: {
      ...process.env,
      NODE_ENV: isPackaged ? "production" : "development",
      CONFIG_PATH: configPath,
      DB_PATH: dbPath,
    },
    stdio: "inherit",
  });

  serverProcess.on("error", (err) => {
    console.error("❌ Backend Server Error:", err);
  });

  serverProcess.on("exit", (code) => {
    console.log(`📡 Backend Server exited with code ${code}`);
  });
}

const escpos = require("escpos");
escpos.USB = require("escpos-usb");
escpos.Serial = require("escpos-serialport");

const isDev = process.env.NODE_ENV === "development";

let serialPortCallback = null;
let mainWindow = null;

// IPC Handlers for Printer
ipcMain.handle("printer:list-usb", async () => {
  try {
    return escpos.USB.findPrinter();
  } catch (err) {
    console.error("Error listing USB printers:", err);
    return [];
  }
});

ipcMain.handle("printer:list-serial", async () => {
  try {
    const { SerialPort } = require("serialport");
    const ports = await SerialPort.list();
    console.log("🔍 Detected Serial Ports:", ports);
    return ports;
  } catch (err) {
    console.error("Error listing Serial ports:", err);
    return [];
  }
});

ipcMain.handle(
  "printer:print",
  async (event, { deviceType, deviceQuery, content }) => {
    return new Promise((resolve, reject) => {
      try {
        let device;
        if (deviceType === "usb") {
          device = new escpos.USB();
        } else if (deviceType === "serial") {
          if (!deviceQuery || !deviceQuery.path) {
            return reject(new Error("Serial port path is required"));
          }

          // Implementation manual SerialPort adapter for escpos compatibility
          const { SerialPort } = require("serialport");
          console.log(
            `🔌 Attempting to open Serial Printer at ${deviceQuery.path} (${deviceQuery.baudRate || 9600})`,
          );

          const port = new SerialPort({
            path: deviceQuery.path,
            baudRate: parseInt(deviceQuery.baudRate || 9600),
            autoOpen: false,
            lock: false, // Don't lock the port to avoid semaphore issues if shared
            hupcl: false, // Don't hang up clear (prevents reset on some devices)
          });

          device = {
            open: (cb) => {
              console.log(`📡 Opening port ${deviceQuery.path}...`);
              port.open((err) => {
                if (err) {
                  console.error(
                    `❌ Failed to open port ${deviceQuery.path}:`,
                    err,
                  );
                  return cb(err);
                }
                console.log(`✅ Port ${deviceQuery.path} opened successfully.`);
                cb(null);
              });
            },
            write: (data, cb) => port.write(data, cb),
            close: (cb) => {
              console.log(`🔌 Closing port ${deviceQuery.path}...`);
              port.close(cb);
            },
          };
        } else {
          return reject(new Error("Unsupported printer device type"));
        }

        const options = { encoding: "GB18030" };
        const printer = new escpos.Printer(device, options);

        device.open((err) => {
          if (err) return reject(err);

          // Basic Formatting
          printer
            .font("a")
            .align("ct")
            .style("bu")
            .size(1, 1)
            .text(content.title || "Timbangan Receipt");
          printer.text("--------------------------------");

          if (content.details) {
            content.details.forEach((line) => printer.align("lt").text(line));
          }

          printer.text("--------------------------------");
          printer.align("ct").text(content.footer || "Terima Kasih");
          printer.cut().close();
          resolve({ success: true });
        });
      } catch (err) {
        reject(err);
      }
    });
  },
);

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: "Tconnect_V4.0",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      experimentalFeatures: true,
    },
  });

  if (isDev) {
    win.loadURL("http://localhost:5173");
    win.webContents.openDevTools();
  } else {
    // Jalankan file secara relatif terhadap lokasi script ini
    win.loadFile(path.join(__dirname, "dist/index.html"));
  }

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  // Handle Serial Port Selection
  win.webContents.session.on(
    "select-serial-port",
    (event, portList, webContents, callback) => {
      event.preventDefault();
      serialPortCallback = callback;
      win.webContents.send("serial:show-picker", portList);
    },
  );

  ipcMain.on("serial:choose-port", (event, portId) => {
    if (serialPortCallback) {
      serialPortCallback(portId);
      serialPortCallback = null;
    }
  });

  mainWindow = win;

  win.webContents.session.setPermissionCheckHandler(
    (webContents, permission, requestingOrigin, details) => {
      if (permission === "serial") {
        return true;
      }
      return false;
    },
  );

  win.webContents.session.setDevicePermissionHandler((details) => {
    if (details.deviceType === "serial") {
      return true;
    }
    return false;
  });
}

app.whenReady().then(() => {
  startBackend();
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (serverProcess) serverProcess.kill();
  if (process.platform !== "darwin") app.quit();
});
