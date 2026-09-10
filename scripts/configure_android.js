const fs = require('fs');
const path = require('path');

function configureAndroid() {
  console.log('--- Configuring Android for Strict Landscape & Immersive Fullscreen ---');

  // 1. AndroidManifest.xml -> Add screenOrientation="sensorLandscape" + mic permissions
  const manifestPath = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
  if (fs.existsSync(manifestPath)) {
    let manifest = fs.readFileSync(manifestPath, 'utf8');
    if (!manifest.includes('android:screenOrientation')) {
      manifest = manifest.replace(
        '<activity',
        '<activity\n            android:screenOrientation="sensorLandscape"'
      );
      console.log('✅ Added android:screenOrientation="sensorLandscape" to AndroidManifest.xml');
    } else {
      console.log('ℹ️ screenOrientation already present in AndroidManifest.xml');
    }

    if (!manifest.includes('android.permission.RECORD_AUDIO')) {
      manifest = manifest.replace(
        '<application',
        '<uses-permission android:name="android.permission.RECORD_AUDIO" />\n    <uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />\n\n    <application'
      );
      console.log('✅ Added RECORD_AUDIO/MODIFY_AUDIO_SETTINGS permissions to AndroidManifest.xml');
    } else {
      console.log('ℹ️ RECORD_AUDIO permission already present in AndroidManifest.xml');
    }

    fs.writeFileSync(manifestPath, manifest, 'utf8');
  } else {
    console.warn('⚠️ AndroidManifest.xml not found at:', manifestPath);
  }

  // 2. styles.xml -> Add windowFullscreen and layoutInDisplayCutoutMode
  const stylesPath = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res', 'values', 'styles.xml');
  if (fs.existsSync(stylesPath)) {
    let styles = fs.readFileSync(stylesPath, 'utf8');
    if (!styles.includes('android:windowFullscreen')) {
      styles = styles.replace(
        /<\/style>/g,
        '    <item name="android:windowFullscreen">true</item>\n        <item name="android:windowContentOverlay">@null</item>\n        <item name="android:windowLayoutInDisplayCutoutMode">shortEdges</item>\n    </style>'
      );
      fs.writeFileSync(stylesPath, styles, 'utf8');
      console.log('✅ Added windowFullscreen and layoutInDisplayCutoutMode to styles.xml');
    }
  } else {
    console.warn('⚠️ styles.xml not found at:', stylesPath);
  }

  // 3. MainActivity.java -> Immersive Sticky Fullscreen Flags
  const mainActivityPath = path.join(
    __dirname,
    '..',
    'android',
    'app',
    'src',
    'main',
    'java',
    'com',
    'tankgame',
    'arena',
    'MainActivity.java'
  );
  if (fs.existsSync(path.dirname(mainActivityPath))) {
    const javaCode = `package com.tankgame.arena;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        hideSystemUI();

        if (Build.VERSION.SDK_INT >= 23 &&
            checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{ Manifest.permission.RECORD_AUDIO }, 100);
        }
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            hideSystemUI();
        }
    }

    private void hideSystemUI() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            getWindow().getAttributes().layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            getWindow().setDecorFitsSystemWindows(false);
            WindowInsetsController controller = getWindow().getInsetsController();
            if (controller != null) {
                controller.hide(WindowInsets.Type.statusBars() | WindowInsets.Type.navigationBars());
                controller.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
            }
        } else {
            View decorView = getWindow().getDecorView();
            decorView.setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_FULLSCREEN
            );
        }
    }
}
`;
    fs.writeFileSync(mainActivityPath, javaCode, 'utf8');
    console.log('✅ Updated MainActivity.java with Immersive Sticky Fullscreen');
  } else {
    console.warn('⚠️ MainActivity directory not found at:', path.dirname(mainActivityPath));
  }

  // 4. capacitor.config.json -> Inject live reload URL (GitHub Pages)
  const capConfigPath = path.join(__dirname, '..', 'capacitor.config.json');
  if (fs.existsSync(capConfigPath)) {
    try {
      const capConfig = JSON.parse(fs.readFileSync(capConfigPath, 'utf8'));
      capConfig.server = {
        url: "https://asaas0303-lang.github.io/tank-game/",
        cleartext: true
      };
      fs.writeFileSync(capConfigPath, JSON.stringify(capConfig, null, 2), 'utf8');
      console.log('✅ Added GitHub Pages URL to capacitor.config.json (Live Reload Enabled)');
    } catch (e) {
      console.error('❌ Failed to update capacitor.config.json:', e);
    }
  } else {
    console.warn('⚠️ capacitor.config.json not found at:', capConfigPath);
  }

  console.log('--- Android Configuration Complete ---');
}

if (require.main === module) {
  configureAndroid();
}

module.exports = { configureAndroid };
