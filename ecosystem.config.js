const fs = require("fs");
const path = require("path");

let appConfig = {
  exePath: "",
  startArgs: "",
  processName: "",
  easytierEndpoint: "",
};

try {
  const jsonPath = path.join(__dirname, "launcher.json");
  if (fs.existsSync(jsonPath)) {
    appConfig = {
      ...appConfig,
      ...JSON.parse(fs.readFileSync(jsonPath, "utf8").replace(/^\uFEFF/, "")),
    };
  }
} catch (error) {
  console.error("Failed to load launcher.json", error);
}

const isConfigValid = appConfig.exePath && appConfig.exePath.trim() !== "";
const rootDir = __dirname;
const binPath = (name) => path.join(rootDir, "bin", name);
const appPath = (...segments) => path.join(rootDir, "apps", ...segments);
const configPath = (...segments) => path.join(rootDir, "configs", ...segments);
const easyTierScript = fs.existsSync(binPath("easytier-core.exe"))
  ? binPath("easytier-core.exe")
  : binPath("easytier-cli.exe");
const easyTierArgs = ["-i 10.126.126.1", "--network-name my-network", "--network-secret my-secret"];

if (appConfig.easytierEndpoint) {
  easyTierArgs.push(`-e ${appConfig.easytierEndpoint}`);
}

module.exports = {
  apps: [
    {
      name: "Web",
      script: "cmd.exe",
      args: "/c pnpm --filter web start",
      cwd: rootDir,
      env: {
        NODE_ENV: "production",
        PORT: "3000",
      },
      autorestart: true,
    },
    {
      name: "EasyTier",
      script: easyTierScript,
      args: easyTierArgs.join(" "),
      cwd: rootDir,
      autorestart: true,
    },
    {
      name: "Go2RTC",
      script: binPath("go2rtc.exe"),
      args: `-c "${configPath("go2rtc.yaml")}"`,
      cwd: rootDir,
    },
    {
      name: "Sidecar",
      script: appPath("sidecar", "sidecar.js"),
      cwd: appPath("sidecar"),
      env: {
        NODE_ENV: "production",
      },
    },
    {
      name: "3DApp",
      script: isConfigValid ? appPath("sidecar", "app_wrapper.js") : "cmd.exe",
      args: isConfigValid ? "" : "/c echo [INFO] Waiting for configuration... && timeout /t 3600",
      env: {
        EXE_PATH: appConfig.exePath,
        EXE_ARGS: appConfig.startArgs,
        TARGET_PROCESS: appConfig.processName || path.basename(appConfig.exePath),
      },
      autorestart: true,
      restart_delay: 3000,
    },
  ],
};
