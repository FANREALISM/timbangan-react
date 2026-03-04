const config = {
  appId: 'com.tconnect.app',
  appName: 'Tconnect_V4.0',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: {
    androidScheme: "http",
    cleartext: true, // WAJIB untuk akses http:// (port 5000)
    allowNavigation: ["192.168.1.100"],
  },
};
export default config;
