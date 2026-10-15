# Building the Findmit Android app (Play Store) with working camera & microphone

Capacitor is already configured in this project (`capacitor.config.ts`):

- appId: `world.findmit.app`
- appName: `Findmit`
- webDir: `dist`
- server.androidScheme: `https` (required — `getUserMedia` needs a secure context)

- server.url: `https://findmit.live` — the app is server-rendered, so the APK opens
  the live site inside a native shell. Build files are cached on the phone after the
  first open, so later opens are near-instant, and every Publish updates the APK
  automatically (no Play Store re-upload needed for content/UI changes).

The `android/` native folder is NOT generated here; it must be created on your own
machine (it needs Android Studio + the Android SDK to build anyway).

## 1. Export to GitHub, clone, and set up

```bash
npm install
npm run build          # produces dist/
npx cap add android    # creates the android/ folder
```

`npx cap init` is not needed — `capacitor.config.ts` is already committed.

## 2. Apply the native camera/mic setup

1. Copy `android-template/MainActivity.java` over
   `android/app/src/main/java/world/findmit/app/MainActivity.java`.
   This grants the WebView's `PermissionRequest` (camera + mic) automatically —
   without it `getUserMedia()` fails inside the APK even though it works in Chrome.
2. Merge the entries from `android-template/AndroidManifest.permissions.xml`
   into `android/app/src/main/AndroidManifest.xml` (inside `<manifest>`, before
   `<application>`), and on the `<application>` tag set
   `android:hardwareAccelerated="true"` and `android:usesCleartextTraffic="true"`.
3. Optional but recommended runtime-permission plugin:
   `npm install @capacitor-community/permissions` (the app auto-detects it and
   requests CAMERA/RECORD_AUDIO before opening the stream; if it isn't installed
   the WebView prompt is used instead).

## 3. Sync and build

```bash
npm run build
npx cap sync android
npx cap open android
# Android Studio: Build > Clean Project, Build > Rebuild,
# then Build > Generate Signed Bundle (.aab) for the Play Store
```

## 4. Install notes

- Uninstall any older Findmit/FindMeet APK first — Android caches granted/denied
  permission decisions per install.
- On first Go Live / call / voice note, accept the Camera and Microphone prompts.
- If a user previously tapped "Deny", clear it in
  Settings > Apps > Findmit > Permissions > Camera / Microphone.
