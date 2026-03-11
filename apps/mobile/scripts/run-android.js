const fs = require("fs");
const path = require("path");
const { spawn, spawnSync } = require("child_process");

const projectRoot = path.resolve(__dirname, "..");

const staleBuildDirs = [
  path.join(
    projectRoot,
    "node_modules",
    "expo-modules-autolinking",
    "android",
    "expo-gradle-plugin",
    "expo-autolinking-settings-plugin",
    "build"
  ),
  path.join(
    projectRoot,
    "node_modules",
    "expo-modules-autolinking",
    "android",
    "expo-gradle-plugin",
    "settings-plugin",
    "build"
  ),
];

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    stdio: "inherit",
    shell: process.platform === "win32",
    ...options,
  });

  if (typeof result.status === "number" && result.status !== 0) {
    process.exit(result.status);
  }

  if (result.error) {
    throw result.error;
  }
}

function runQuiet(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    stdio: ["ignore", "pipe", "pipe"],
    encoding: "utf8",
    shell: process.platform === "win32",
    ...options,
  });

  if (result.error) {
    throw result.error;
  }

  return result;
}

function removeDirWithRetries(targetDir) {
  if (!fs.existsSync(targetDir)) {
    return;
  }

  let lastError;

  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      fs.rmSync(targetDir, { recursive: true, force: true, maxRetries: 0 });
      return;
    } catch (error) {
      lastError = error;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, attempt * 250);
    }
  }

  throw lastError;
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function getAdbPath() {
  const sdkRoot =
    process.env.ANDROID_SDK_ROOT ||
    process.env.ANDROID_HOME ||
    path.join(process.env.LOCALAPPDATA || "", "Android", "Sdk");

  return path.join(sdkRoot, "platform-tools", process.platform === "win32" ? "adb.exe" : "adb");
}

function getEmulatorPath() {
  const sdkRoot =
    process.env.ANDROID_SDK_ROOT ||
    process.env.ANDROID_HOME ||
    path.join(process.env.LOCALAPPDATA || "", "Android", "Sdk");

  return path.join(sdkRoot, "emulator", process.platform === "win32" ? "emulator.exe" : "emulator");
}

function getConnectedDevices(adbPath) {
  const result = runQuiet(adbPath, ["devices"]);
  const output = result.stdout || "";

  return output
    .split(/\r?\n/)
    .slice(1)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [serial, state] = line.split(/\s+/);
      return { serial, state };
    });
}

function getBootedDevice(adbPath) {
  return getConnectedDevices(adbPath).find((device) => device.state === "device");
}

function getAvailableAvds(emulatorPath) {
  if (!fs.existsSync(emulatorPath)) {
    return [];
  }

  const result = runQuiet(emulatorPath, ["-list-avds"]);
  const output = result.stdout || "";

  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function startEmulator(emulatorPath, avdName) {
  if (process.platform === "win32") {
    spawn("cmd.exe", ["/c", "start", "", emulatorPath, "-avd", avdName], {
      cwd: projectRoot,
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    }).unref();
    return;
  }

  spawn(emulatorPath, ["-avd", avdName], {
    cwd: projectRoot,
    detached: true,
    stdio: "ignore",
  }).unref();
}

function waitForBoot(adbPath, serial, timeoutMs) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const state = runQuiet(adbPath, ["-s", serial, "get-state"]);
    const isOnline = (state.stdout || "").trim() === "device";

    if (isOnline) {
      const boot = runQuiet(adbPath, ["-s", serial, "shell", "getprop", "sys.boot_completed"]);
      if ((boot.stdout || "").trim() === "1") {
        return true;
      }
    }

    sleep(2000);
  }

  return false;
}

function ensureAndroidDeviceReady() {
  const adbPath = getAdbPath();
  const emulatorPath = getEmulatorPath();

  if (!fs.existsSync(adbPath)) {
    return;
  }

  runQuiet(adbPath, ["kill-server"]);
  runQuiet(adbPath, ["start-server"]);

  const existingDevice = getBootedDevice(adbPath);
  if (existingDevice) {
    return;
  }

  const avdName = process.env.ANDROID_EMULATOR_NAME || getAvailableAvds(emulatorPath)[0];
  if (!avdName) {
    return;
  }

  const knownSerials = new Set(getConnectedDevices(adbPath).map((device) => device.serial));
  startEmulator(emulatorPath, avdName);

  const deadline = Date.now() + 120000;
  while (Date.now() < deadline) {
    const emulatorDevice = getConnectedDevices(adbPath).find(
      (device) => device.serial.startsWith("emulator-") && !knownSerials.has(device.serial)
    );

    if (emulatorDevice && waitForBoot(adbPath, emulatorDevice.serial, 180000)) {
      return;
    }

    const anyBootedDevice = getBootedDevice(adbPath);
    if (anyBootedDevice) {
      return;
    }

    sleep(2000);
  }

  throw new Error(`Timed out waiting for Android emulator "${avdName}" to boot.`);
}

const gradleWrapper =
  process.platform === "win32"
    ? path.join(projectRoot, "android", "gradlew.bat")
    : path.join(projectRoot, "android", "gradlew");

run(gradleWrapper, ["--stop"], { cwd: path.join(projectRoot, "android") });

for (const buildDir of staleBuildDirs) {
  removeDirWithRetries(buildDir);
}

ensureAndroidDeviceReady();

run("npx", ["expo", "run:android"]);
