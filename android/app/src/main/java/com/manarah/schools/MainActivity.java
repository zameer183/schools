package com.manarah.schools;

import android.os.Bundle;
import android.webkit.WebView;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  private final OnBackPressedCallback backCallback = new OnBackPressedCallback(true) {
    @Override
    public void handleOnBackPressed() {
      Bridge bridge = getBridge();
      WebView webView = bridge != null ? bridge.getWebView() : null;

      if (webView != null && webView.canGoBack()) {
        webView.goBack();
        return;
      }

      moveTaskToBack(true);
    }
  };

  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    getOnBackPressedDispatcher().addCallback(this, backCallback);
  }
}
