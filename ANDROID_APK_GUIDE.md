# Beam Farm 3D — Web, PWA & Android APK Packaging Guide

โปรเจกต์ **Beam Farm 3D** รองรับการทำงานครบทั้ง **Web (Desktop/Mobile)**, **PWA (Installable Offline App)** และ **Android APK** (ทั้งแบบ Offline Bundled APK ผ่าน Capacitor และ Trusted Web Activity ผ่าน Bubblewrap)

---

## 1. ไอคอนสำหรับมือถือที่เตรียมไว้แล้ว (`/public`)
- `/public/pwa-192x192.png` (192×192) & `/public/pwa-512x512.png` (512×512)
- `/public/pwa-maskable-192x192.png` & `/public/pwa-maskable-512x512.png` (Adaptive Maskable Safe Zone)
- `/public/apple-touch-icon.png` (180×180 สำหรับ iOS Home Screen)
- `/public/icons/icon-48x48.png` ถึง `icon-512x512.png` (ครบทุกความละเอียด mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi)

---

## 2. วิธีสร้างไฟล์ Android `.apk` แบบเล่นออฟไลน์ 100% (Capacitor — แนะนำ)
ไฟล์ตั้งค่า `capacitor.config.json` (`appId: com.beamfarm3d.app`, `webDir: dist`) ถูกเตรียมไว้แล้ว:

```bash
# 1. Build ไฟล์โปรดักชันลงโฟลเดอร์ dist/
npm run build

# 2. ติดตั้ง Capacitor Android (ทำครั้งแรกครั้งเดียวบนเครื่องที่จะ Build APK)
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap add android

# 3. ซิงก์ไฟล์เว็บและโมเดล 3D (.glb) ทั้งหมดเข้าโปรเจกต์ Android
npx cap sync android

# 4. สร้างไฟล์ APK ด้วย Gradle (หรือเปิดใน Android Studio ด้วย npx cap open android)
cd android && ./gradlew assembleDebug
# ไฟล์ APK จะอยู่ที่: android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 3. วิธีสร้างไฟล์ Android `.apk` จาก PWA URL (Bubblewrap TWA)
หากนำเว็บขึ้นโฮสต์ HTTPS แล้ว สามารถแปลง PWA Manifest เป็น Android APK ขนาดเล็กได้ทันที:

```bash
npx @bubblewrap/cli init --manifest https://<YOUR_DOMAIN>/manifest.webmanifest
npx @bubblewrap/cli build
```
*(นำค่า SHA-256 fingerprint ของ Keystore มาใส่ใน `public/.well-known/assetlinks.json` เพื่อให้เปิดเต็มจอไร้แถบ URL)*
