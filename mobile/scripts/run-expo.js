const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const expoCli = path.join(projectRoot, "node_modules", "expo", "bin", "cli");
const localPlatformTools = path.join(
  projectRoot,
  "tools",
  "android-sdk",
  "platform-tools"
);
const localAndroidHome = path.join(projectRoot, "tools", "android-home");
const localJdk = path.join(projectRoot, "tools", "jdk");

const env = { ...process.env };

if (!env.JAVA_HOME) {
  env.JAVA_HOME = localJdk;
}

if (process.platform === "win32") {
  env.PATH = `${localPlatformTools};${path.join(env.JAVA_HOME, "bin")};${env.PATH || ""}`;
} else {
  env.PATH = `${localPlatformTools}:${path.join(env.JAVA_HOME, "bin")}:${env.PATH || ""}`;
}

if (!env.ANDROID_HOME) {
  env.ANDROID_HOME = path.join(projectRoot, "tools", "android-sdk");
}

if (!env.ANDROID_SDK_ROOT) {
  env.ANDROID_SDK_ROOT = env.ANDROID_HOME;
}

if (!env.ANDROID_SDK_HOME) {
  env.ANDROID_SDK_HOME = localAndroidHome;
}

if (!env.ANDROID_AVD_HOME) {
  env.ANDROID_AVD_HOME = path.join(localAndroidHome, ".android", "avd");
}

fs.mkdirSync(env.ANDROID_SDK_HOME, { recursive: true });

const child = spawn(
  process.execPath,
  [expoCli, "start", ...process.argv.slice(2)],
  {
    cwd: projectRoot,
    env,
    stdio: "inherit",
  }
);

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
