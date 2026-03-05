const path = require("path");
const fs = require("fs");

/**
 * Resolves application paths reliably across platforms (Electron vs Standard Node)
 */
function getAppPaths() {
  const isElectron = !!process.versions.electron;

  // Base directory for assets (config, db)
  // In Electron production, we might want these in userData
  // For now, staying relative to the server folder
  const baseDir = path.resolve(__dirname, "..", "..");

  return {
    config: path.resolve(baseDir, "config.ini"),
    sqlite: path.resolve(baseDir, "timbangan.db"),
  };
}

module.exports = { getAppPaths };
