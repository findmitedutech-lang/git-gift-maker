package world.findmit.app;

import android.os.Bundle;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

/**
 * Findmit Android entry point.
 *
 * The Android WebView does NOT grant camera/microphone to web content by default,
 * even when the Android app itself already holds the CAMERA / RECORD_AUDIO
 * permissions. Without the onPermissionRequest override below, getUserMedia()
 * inside the APK fails with NotAllowedError while working fine in the browser.
 *
 * Copy this file to:
 *   android/app/src/main/java/world/findmit/app/MainActivity.java
 */
public class MainActivity extends BridgeActivity {

  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    WebView webView = getBridge().getWebView();
    webView.setWebChromeClient(
      new WebChromeClient() {
        @Override
        public void onPermissionRequest(final PermissionRequest request) {
          // MUST run on the UI thread — granting from the WebChromeClient
          // callback thread can silently fail on some devices.
          runOnUiThread(() -> request.grant(request.getResources()));
        }
      }
    );
  }
}
