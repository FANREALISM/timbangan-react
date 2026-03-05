package com.tconnect.app;

import android.os.Bundle;
import android.webkit.WebSettings; // Tambahkan ini
import android.webkit.WebView;     // Tambahkan ini
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Register Custom Plugins BEFORE super.onCreate
        registerPlugin(com.tconnect.app.plugins.CustomHardwarePlugin.class);

        super.onCreate(savedInstanceState);

        // Tambahkan blok kode ini
        WebView webView = this.getBridge().getWebView();
        WebSettings settings = webView.getSettings();
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
    }
}
