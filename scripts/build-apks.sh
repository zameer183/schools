#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ANDROID="$ROOT/android"
APK_OUT="$ROOT/dist-apk"
JAVA_HOME="C:/Program Files/Android/Android Studio/jbr"
export JAVA_HOME

mkdir -p "$APK_OUT"

CAP_CONFIG="$ROOT/capacitor.config.ts"
BUILD_GRADLE="$ANDROID/app/build.gradle"
STRINGS_XML="$ANDROID/app/src/main/res/values/strings.xml"
APK_SRC="$ANDROID/app/build/outputs/apk/debug/app-debug.apk"

cap_original=$(cat "$CAP_CONFIG")
gradle_original=$(cat "$BUILD_GRADLE")
strings_original=$(cat "$STRINGS_XML")

restore() {
  echo "$cap_original" > "$CAP_CONFIG"
  echo "$gradle_original" > "$BUILD_GRADLE"
  echo "$strings_original" > "$STRINGS_XML"
  echo "[Restored original configs]"
}
trap restore EXIT

build_variant() {
  local NAME="$1"
  local APP_ID="$2"
  local APP_NAME="$3"
  local SERVER_URL="$4"
  local APK_NAME="$5"

  echo ""
  echo "=================================================="
  echo "Building $APP_NAME ($APP_ID)"
  echo "Entry: $SERVER_URL"
  echo "=================================================="

  # Update capacitor.config.ts
  cat > "$CAP_CONFIG" <<EOF
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: '$APP_ID',
  appName: '$APP_NAME',
  webDir: 'public',
  server: {
    url: '$SERVER_URL',
    cleartext: false
  }
};

export default config;
EOF

  # Update applicationId in build.gradle
  sed -i "s/applicationId \"com.getcapacitor.app\"/applicationId \"$APP_ID\"/" "$BUILD_GRADLE"

  # Update strings.xml
  sed -i "s/>Manarah Institute</>$APP_NAME</g" "$STRINGS_XML"
  sed -i "s/>com.manarah.schools</>$APP_ID</g" "$STRINGS_XML"

  # Cap sync
  echo "[1/2] Syncing Capacitor..."
  cd "$ROOT" && npx cap sync android

  # Gradle build
  echo "[2/2] Building APK..."
  cd "$ANDROID" && ./gradlew assembleDebug

  # Copy APK
  cp "$APK_SRC" "$APK_OUT/$APK_NAME"
  echo "✓ $APK_NAME saved to $APK_OUT"
}

build_variant \
  "teacher" \
  "com.manarah.teacher" \
  "Manarah Teacher" \
  "https://schools-plum.vercel.app/login/teacher" \
  "manarah-teacher.apk"

# Restore before student build (sed modifies in-place)
echo "$gradle_original" > "$BUILD_GRADLE"
echo "$strings_original" > "$STRINGS_XML"

build_variant \
  "student" \
  "com.manarah.student" \
  "Manarah Student" \
  "https://schools-plum.vercel.app/login/student" \
  "manarah-student.apk"

echo ""
echo "Done! APKs in: $APK_OUT"
ls -lh "$APK_OUT"
