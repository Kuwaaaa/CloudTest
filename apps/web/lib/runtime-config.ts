import fs from "fs";
import path from "path";

import {
  DEFAULT_RUNTIME_CONFIG,
  normalizeRuntimeConfig,
  type RuntimeConfig,
} from "@workspace/config";

import { resolveWorkspaceFile, writeFileAtomicSync } from "./workspace";

const readJsonFile = (filePath: string) => {
  if (!fs.existsSync(filePath)) return {};

  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8")) as Record<string, unknown>;
  } catch {
    return {};
  }
};

const RUNTIME_CONFIG_KEYS = [
  "exePath",
  "startArgs",
  "processName",
  "rtcPreset",
  "rtcHost",
  "rtcApiPort",
  "rtcWebrtcPort",
  "rtcUseHttps",
  "controlWsUrl",
  "webrtcBaseUrl",
  "easytierEndpoint",
  "go2rtcCandidate",
  "transportMode",
  "videoBitrateMbps",
  "videoFps",
  "videoResolution",
  "iceServers",
] as const;

const pickRuntimeConfig = (value: Partial<RuntimeConfig> | Record<string, unknown>) => {
  const picked: Record<string, unknown> = {};

  for (const key of RUNTIME_CONFIG_KEYS) {
    if (key in value) picked[key] = value[key];
  }

  return picked;
};

const parseResolution = (resolution: string) => {
  const [width = "1920", height = "1080"] = resolution.split("x");
  return {
    width: Number(width) || 1920,
    height: Number(height) || 1080,
  };
};

const buildFfmpegArgs = (config: RuntimeConfig) => {
  const { width, height } = parseResolution(config.videoResolution);
  const bitrate = `${config.videoBitrateMbps}M`;

  return [
    "ffmpeg",
    "-f lavfi",
    `-i ddagrab=0:framerate=${config.videoFps}:video_size=${width}x${height}`,
    "-c:v h264_nvenc",
    "-preset p1",
    "-zerolatency 1",
    "-rc cbr_ld_hq",
    `-g ${config.videoFps}`,
    `-b:v ${bitrate}`,
    `-maxrate ${bitrate}`,
    `-bufsize ${bitrate}`,
    "-rtsp_transport tcp",
    "-f rtsp {output}",
  ].join(" ");
};

const buildGo2RtcConfig = (config: RuntimeConfig) => `log:
  level: debug
  api: debug
  exec: debug
  rtsp: debug

api:
  listen: ":1984"
  origin: "*"

rtsp:
  listen: ":8554"

webrtc:
  listen: ":8555"
  candidates:
    - ${config.go2rtcCandidate}

streams:
  p_cg: exec:${buildFfmpegArgs(config)}
`;

export const getLauncherConfigPath = () => {
  const overridePath = process.env.CLOUDTEST_LAUNCHER_PATH?.trim();
  return overridePath ? path.resolve(overridePath) : resolveWorkspaceFile("launcher.json");
};

export const getGo2RtcConfigPath = () => {
  const overridePath = process.env.CLOUDTEST_GO2RTC_CONFIG_PATH?.trim();
  return overridePath ? path.resolve(overridePath) : resolveWorkspaceFile(path.join("configs", "go2rtc.yaml"));
};

export const readRuntimeConfig = (): RuntimeConfig => {
  const launcherPath = getLauncherConfigPath();
  const rawConfig = readJsonFile(launcherPath);

  return normalizeRuntimeConfig({
    ...DEFAULT_RUNTIME_CONFIG,
    ...rawConfig,
  });
};

export const writeRuntimeConfig = (nextConfig: Partial<RuntimeConfig> | Record<string, unknown>) => {
  const launcherPath = getLauncherConfigPath();
  const go2RtcPath = getGo2RtcConfigPath();
  const currentConfig = readJsonFile(launcherPath);
  const normalizedConfig = normalizeRuntimeConfig({
    ...currentConfig,
    ...pickRuntimeConfig(nextConfig),
  });

  const launcherContent = JSON.stringify(normalizedConfig, null, 2);
  const go2RtcContent = buildGo2RtcConfig(normalizedConfig);

  writeFileAtomicSync(launcherPath, launcherContent);
  writeFileAtomicSync(go2RtcPath, go2RtcContent);

  return normalizedConfig;
};
