package com.tconnect.app.plugins;

import android.Manifest;
import android.app.PendingIntent;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothSocket;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.hardware.usb.UsbDevice;
import android.hardware.usb.UsbDeviceConnection;
import android.hardware.usb.UsbManager;
import android.os.Build;
import android.util.Log;

import androidx.core.app.ActivityCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.hoho.android.usbserial.driver.UsbSerialDriver;
import com.hoho.android.usbserial.driver.UsbSerialPort;
import com.hoho.android.usbserial.driver.UsbSerialProber;
import com.hoho.android.usbserial.driver.ProbeTable;
import com.hoho.android.usbserial.driver.Ch34xSerialDriver;
import com.hoho.android.usbserial.driver.Cp21xxSerialDriver;
import com.hoho.android.usbserial.driver.FtdiSerialDriver;
import com.hoho.android.usbserial.driver.ProlificSerialDriver;
import com.hoho.android.usbserial.util.SerialInputOutputManager;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Executors;

@CapacitorPlugin(name = "CustomHardware")
public class CustomHardwarePlugin extends Plugin implements SerialInputOutputManager.Listener {

    private static final String TAG = "CustomHardwarePlugin";
    private static final String ACTION_USB_PERMISSION = "com.tconnect.app.USB_PERMISSION";
    
    // Bluetooth SPP UUID
    private static final UUID MY_UUID_INSECURE = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB");

    // Bluetooth Variables
    private BluetoothAdapter btAdapter;
    private BluetoothSocket btSocket;
    private InputStream btInStream;
    private OutputStream btOutStream;
    private Thread btReadThread;
    private boolean isBtConnected = false;

    // USB Variables
    private UsbManager usbManager;
    private UsbSerialPort usbSerialPort;
    private SerialInputOutputManager usbIoManager;
    private boolean isUsbConnected = false;
    private PluginCall pendingUsbCall;

    @Override
    public void load() {
        super.load();
        btAdapter = BluetoothAdapter.getDefaultAdapter();
        usbManager = (UsbManager) getContext().getSystemService(Context.USB_SERVICE);
    }

    @PluginMethod
    public void getPairedDevices(PluginCall call) {
        if (btAdapter == null) {
            call.reject("Bluetooth tidak didukung di perangkat ini.");
            return;
        }

        if (ActivityCompat.checkSelfPermission(getContext(), Manifest.permission.BLUETOOTH_CONNECT) != PackageManager.PERMISSION_GRANTED) {
            // we assume permissions are handled or it's < Android 12 for simplicity in this prototype.
        }

        com.getcapacitor.JSArray devicesArray = new com.getcapacitor.JSArray();
        for (BluetoothDevice device : btAdapter.getBondedDevices()) {
            JSObject deviceObj = new JSObject();
            deviceObj.put("name", device.getName());
            deviceObj.put("address", device.getAddress());
            devicesArray.put(deviceObj);
        }

        JSObject ret = new JSObject();
        ret.put("devices", devicesArray);
        call.resolve(ret);
    }

    @PluginMethod
    public void connectBluetooth(PluginCall call) {
        if (btAdapter == null) {
            call.reject("Bluetooth tidak didukung di perangkat ini.");
            return;
        }

        if (!btAdapter.isEnabled()) {
            call.reject("Bluetooth belum diaktifkan.");
            return;
        }

        // Simplification for prototype: connect to the first paired device, or requires MAC address
        String macAddress = call.getString("macAddress");
        if (macAddress == null || macAddress.isEmpty()) {
            // Find first paired device for demo purposes if MAC not provided
            if (ActivityCompat.checkSelfPermission(getContext(), Manifest.permission.BLUETOOTH_CONNECT) != PackageManager.PERMISSION_GRANTED) {
                 // Requires Android 12+ permissions handling in real app
            }
            
            BluetoothDevice firstDevice = null;
            for (BluetoothDevice device : btAdapter.getBondedDevices()) {
                firstDevice = device;
                break;
            }
            
            if (firstDevice == null) {
                 call.reject("Tidak ada perangkat Bluetooth tersimpan.");
                 return;
            }
            macAddress = firstDevice.getAddress();
        }

        BluetoothDevice device = btAdapter.getRemoteDevice(macAddress);

        try {
            btSocket = device.createRfcommSocketToServiceRecord(MY_UUID_INSECURE);
            btSocket.connect();
            btInStream = btSocket.getInputStream();
            btOutStream = btSocket.getOutputStream();
            isBtConnected = true;

            startBluetoothListener();
            
            JSObject ret = new JSObject();
            ret.put("status", "connected");
            ret.put("type", "bluetooth");
            call.resolve(ret);

        } catch (IOException e) {
            Log.e(TAG, "Bluetooth connect error", e);
            try {
                if (btSocket != null) btSocket.close();
            } catch (IOException ex) {}
            isBtConnected = false;
            call.reject("Gagal terhubung ke Bluetooth: " + e.getMessage());
        }
    }

    private void startBluetoothListener() {
        btReadThread = new Thread(() -> {
            byte[] buffer = new byte[1024];
            int bytes;

            while (isBtConnected && btSocket != null) {
                try {
                    bytes = btInStream.read(buffer);
                    if (bytes > 0) {
                        byte[] data = new byte[bytes];
                        System.arraycopy(buffer, 0, data, 0, bytes);
                        String str = new String(data, "UTF-8");
                        
                        JSObject ret = new JSObject();
                        ret.put("data", str);
                        notifyListeners("onDataReceived", ret);
                    }
                } catch (IOException e) {
                    Log.d(TAG, "Input stream was disconnected", e);
                    isBtConnected = false;
                    break;
                }
            }
        });
        btReadThread.start();
    }

    @PluginMethod
    public void connectUsb(PluginCall call) {
        int baudRate = call.getInt("baudRate", 9600);

        // Create a custom prober to detect clones and generic chips
        ProbeTable customTable = new ProbeTable();
        customTable.addProduct(0x1a86, 0x7523, Ch34xSerialDriver.class); // CH340
        customTable.addProduct(0x1a86, 0x5523, Ch34xSerialDriver.class); // CH341A
        customTable.addProduct(0x10c4, 0xea60, Cp21xxSerialDriver.class); // CP210x
        customTable.addProduct(0x0403, 0x6001, FtdiSerialDriver.class); // FTDI
        customTable.addProduct(0x067b, 0x2303, ProlificSerialDriver.class); // Prolific
        
        UsbSerialProber prober = new UsbSerialProber(customTable);
        List<UsbSerialDriver> availableDrivers = prober.findAllDrivers(usbManager);
        
        // Fallback to default prober if custom one didn't find anything
        if (availableDrivers.isEmpty()) {
            availableDrivers = UsbSerialProber.getDefaultProber().findAllDrivers(usbManager);
        }

        if (availableDrivers.isEmpty()) {
            call.reject("Tidak ada perangkat USB Serial yang terdeteksi.");
            return;
        }

        UsbSerialDriver driver = availableDrivers.get(0);
        UsbDevice device = driver.getDevice();

        if (usbManager.hasPermission(device)) {
            openUsbPort(call, driver, baudRate);
        } else {
            pendingUsbCall = call;
            PendingIntent permissionIntent = PendingIntent.getBroadcast(getContext(), 0, new Intent(ACTION_USB_PERMISSION), PendingIntent.FLAG_IMMUTABLE);
            
            IntentFilter filter = new IntentFilter(ACTION_USB_PERMISSION);
            getContext().registerReceiver(usbReceiver, filter);
            
            usbManager.requestPermission(device, permissionIntent);
        }
    }

    private final BroadcastReceiver usbReceiver = new BroadcastReceiver() {
        public void onReceive(Context context, Intent intent) {
            String action = intent.getAction();
            if (ACTION_USB_PERMISSION.equals(action)) {
                synchronized (this) {
                    UsbDevice device = intent.getParcelableExtra(UsbManager.EXTRA_DEVICE);
                    if (intent.getBooleanExtra(UsbManager.EXTRA_PERMISSION_GRANTED, false)) {
                        if (device != null && pendingUsbCall != null) {
                            
                            ProbeTable customTable = new ProbeTable();
                            customTable.addProduct(0x1a86, 0x7523, Ch34xSerialDriver.class);
                            customTable.addProduct(0x1a86, 0x5523, Ch34xSerialDriver.class);
                            customTable.addProduct(0x10c4, 0xea60, Cp21xxSerialDriver.class);
                            customTable.addProduct(0x0403, 0x6001, FtdiSerialDriver.class);
                            customTable.addProduct(0x067b, 0x2303, ProlificSerialDriver.class);
                            
                            UsbSerialProber prober = new UsbSerialProber(customTable);
                            List<UsbSerialDriver> availableDrivers = prober.findAllDrivers(usbManager);
                            if (availableDrivers.isEmpty()) {
                                availableDrivers = UsbSerialProber.getDefaultProber().findAllDrivers(usbManager);
                            }

                            if (!availableDrivers.isEmpty()) {
                                openUsbPort(pendingUsbCall, availableDrivers.get(0), pendingUsbCall.getInt("baudRate", 9600));
                            }
                        }
                    } else {
                        if (pendingUsbCall != null) {
                            pendingUsbCall.reject("Izin USB ditolak.");
                        }
                    }
                    pendingUsbCall = null;
                    getContext().unregisterReceiver(this);
                }
            }
        }
    };

    private void openUsbPort(PluginCall call, UsbSerialDriver driver, int baudRate) {
        UsbDeviceConnection connection = usbManager.openDevice(driver.getDevice());
        if (connection == null) {
             call.reject("Gagal membuka koneksi USB (jangan buka di app lain).");
             return;
        }

        usbSerialPort = driver.getPorts().get(0);
        try {
            usbSerialPort.open(connection);
            usbSerialPort.setParameters(baudRate, 8, UsbSerialPort.STOPBITS_1, UsbSerialPort.PARITY_NONE);
            
            usbIoManager = new SerialInputOutputManager(usbSerialPort, this);
            Executors.newSingleThreadExecutor().submit(usbIoManager);
            
            isUsbConnected = true;
            
            JSObject ret = new JSObject();
            ret.put("status", "connected");
            ret.put("type", "usb");
            call.resolve(ret);
            
        } catch (IOException e) {
            Log.e(TAG, "USB open error", e);
            try {
                usbSerialPort.close();
            } catch (IOException ex) {}
            isUsbConnected = false;
            call.reject("Gagal membuka port USB: " + e.getMessage());
        }
    }

    @Override
    public void onNewData(byte[] data) {
        try {
            String str = new String(data, "UTF-8");
            JSObject ret = new JSObject();
            ret.put("data", str);
            notifyListeners("onDataReceived", ret);
        } catch (Exception e) {
            Log.e(TAG, "Error encoding USB data", e);
        }
    }

    @Override
    public void onRunError(Exception e) {
        Log.e(TAG, "USB run error", e);
        disconnectInternal();
    }

    @PluginMethod
    public void write(PluginCall call) {
        String dataStr = call.getString("data");
        if (dataStr == null) {
            call.reject("Data tidak boleh kosong");
            return;
        }
        
        // For simple string to byte array (Note: printer payloads might need raw bytes, we'll convert string back or accept arrays)
        // In real implementation for ESC/POS, base64 or JSONArray of ints is safer. 
        // We'll use simple UTF-8 or raw bytes parsing for now.
        byte[] bytes = android.util.Base64.decode(dataStr, android.util.Base64.DEFAULT);


        try {
            if (isBtConnected && btOutStream != null) {
                btOutStream.write(bytes);
                call.resolve();
            } else if (isUsbConnected && usbSerialPort != null) {
                usbSerialPort.write(bytes, 1000);
                call.resolve();
            } else {
                call.reject("Tidak ada perangkat hardware terhubung.");
            }
        } catch (IOException e) {
            Log.e(TAG, "Write error", e);
            call.reject("Gagal mengirim data: " + e.getMessage());
        }
    }

    @PluginMethod
    public void disconnect(PluginCall call) {
        disconnectInternal();
        call.resolve();
    }
    
    private void disconnectInternal() {
        if (btSocket != null) {
            try { btSocket.close(); } catch (IOException e) {}
            btSocket = null;
        }
        if (btInStream != null) {
            try { btInStream.close(); } catch (IOException e) {}
            btInStream = null;
        }
        if (btOutStream != null) {
            try { btOutStream.close(); } catch (IOException e) {}
            btOutStream = null;
        }
        isBtConnected = false;

        if (usbIoManager != null) {
            usbIoManager.stop();
            usbIoManager = null;
        }
        if (usbSerialPort != null) {
            try { usbSerialPort.close(); } catch (IOException e) {}
            usbSerialPort = null;
        }
        isUsbConnected = false;
    }
}
