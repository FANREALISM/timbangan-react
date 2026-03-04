package com.tconnect.app;

import android.os.Bundle;
import android.webkit.WebSettings; // Tambahkan ini
import android.webkit.WebView;     // Tambahkan ini
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Tambahkan blok kode ini
        WebView webView = this.getBridge().getWebView();
        WebSettings settings = webView.getSettings();
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
    }
}
