"""
Build teacher and student APKs with distinct appId, app name, and deep link entry.
Usage: python scripts/build-apks.py
"""

import subprocess, shutil, os
from pathlib import Path

ROOT = Path(__file__).parent.parent
ANDROID = ROOT / "android"
APK_OUT = ROOT / "dist-apk"
JAVA_HOME = r"C:\Program Files\Android\Android Studio\jbr"

VARIANTS = [
    {
        "name": "teacher",
        "appId": "com.manarah.teacher",
        "appName": "Manarah Teacher",
        "serverUrl": "https://schools-plum.vercel.app/login/teacher",
        "apk": "manarah-teacher.apk",
    },
    {
        "name": "student",
        "appId": "com.manarah.student",
        "appName": "Manarah Student",
        "serverUrl": "https://schools-plum.vercel.app/login/student",
        "apk": "manarah-student.apk",
    },
]

CAP_CONFIG = ROOT / "capacitor.config.ts"
BUILD_GRADLE = ANDROID / "app" / "build.gradle"
STRINGS_XML = ANDROID / "app" / "src" / "main" / "res" / "values" / "strings.xml"
APK_DEBUG = ANDROID / "app" / "build" / "outputs" / "apk" / "debug" / "app-debug.apk"

cap_original = CAP_CONFIG.read_text(encoding="utf-8")
gradle_original = BUILD_GRADLE.read_text(encoding="utf-8")
strings_original = STRINGS_XML.read_text(encoding="utf-8")

APK_OUT.mkdir(exist_ok=True)

def run(cmd, cwd=None):
    env = os.environ.copy()
    env["JAVA_HOME"] = JAVA_HOME
    result = subprocess.run(["bash", "-c", cmd], cwd=cwd or ROOT, env=env)
    if result.returncode != 0:
        raise RuntimeError(f"Command failed: {cmd}")

try:
    for v in VARIANTS:
        print(f"\n{'='*50}")
        print(f"Building {v['appName']} ({v['appId']})")
        print(f"Entry: {v['serverUrl']}")
        print('='*50)

        # 1 — Update capacitor.config.ts
        new_cap = f"""import type {{ CapacitorConfig }} from '@capacitor/cli';

const config: CapacitorConfig = {{
  appId: '{v["appId"]}',
  appName: '{v["appName"]}',
  webDir: 'public',
  server: {{
    url: '{v["serverUrl"]}',
    cleartext: false
  }}
}};

export default config;
"""
        CAP_CONFIG.write_text(new_cap, encoding="utf-8")

        # 2 — Update applicationId in build.gradle
        new_gradle = gradle_original.replace(
            'applicationId "com.getcapacitor.app"',
            f'applicationId "{v["appId"]}"'
        )
        BUILD_GRADLE.write_text(new_gradle, encoding="utf-8")

        # 3 — Update app_name in strings.xml
        new_strings = strings_original \
            .replace('>Manarah Institute<', f'>{v["appName"]}<') \
            .replace('>com.manarah.schools<', f'>{v["appId"]}<')
        STRINGS_XML.write_text(new_strings, encoding="utf-8")

        # 4 — cap sync
        print("\n[1/2] Syncing Capacitor...")
        run("npx cap sync android")

        # 5 — Gradle build
        print("\n[2/2] Building APK...")
        run(f"./gradlew assembleDebug", cwd=ANDROID)

        # 6 — Copy APK
        dest = APK_OUT / v["apk"]
        shutil.copy2(APK_DEBUG, dest)
        size_mb = dest.stat().st_size / 1024 / 1024
        print(f"\n✓ {v['apk']} ({size_mb:.1f} MB) → {dest}")

finally:
    # Restore originals
    CAP_CONFIG.write_text(cap_original, encoding="utf-8")
    BUILD_GRADLE.write_text(gradle_original, encoding="utf-8")
    STRINGS_XML.write_text(strings_original, encoding="utf-8")
    print("\n[Restored original configs]")

print(f"\nDone. APKs in: {APK_OUT}")
