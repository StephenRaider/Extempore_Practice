// One-command debug APK build: syncs the web app into the Android project, runs Gradle, and copies the APK to dist/.
// Usage: npm run apk        (needs Node 22+, JDK 17+ and the Android SDK; see README.md)
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, copyFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const android = join(root, 'android');
const win = process.platform === 'win32';
const run = (cmd, args, cwd) => {
  const r = spawnSync(cmd, args, { cwd, stdio: 'inherit', shell: win });
  if (r.status !== 0) { console.error(`\n✖ "${cmd} ${args.join(' ')}" failed`); process.exit(r.status || 1); }
};

// Make sure Gradle can find the Android SDK.
const sdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
const localProps = join(android, 'local.properties');
if (!existsSync(localProps)) {
  if (!sdk) {
    console.error('✖ Android SDK not found. Install Android Studio (or the command-line tools) and set ANDROID_HOME, e.g.\n  Windows: setx ANDROID_HOME "%LOCALAPPDATA%\\Android\\Sdk"\nThen open a new terminal and run this again.');
    process.exit(1);
  }
  writeFileSync(localProps, `sdk.dir=${sdk.replace(/\\/g, '\\\\')}\n`);
  console.log(`Wrote android/local.properties (sdk.dir=${sdk})`);
}

run('node', [join(root, 'scripts', 'check-data.mjs')], root);
run('npx', ['cap', 'sync', 'android'], root);
run(win ? 'gradlew.bat' : './gradlew', ['assembleDebug'], android);

const apk = join(android, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
if (!existsSync(apk)) { console.error('✖ Build finished but the APK was not found at', apk); process.exit(1); }
mkdirSync(join(root, 'dist'), { recursive: true });
const out = join(root, 'dist', 'extempore-prep-debug.apk');
copyFileSync(apk, out);
console.log(`\n✔ Debug APK ready: ${out}`);
