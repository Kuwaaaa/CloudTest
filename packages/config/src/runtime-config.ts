export interface RuntimeConfig {
  exePath: string;
  startArgs: string;
  processName: string;
  rtcPreset: "manual" | "local" | "vps" | "easytier";
  rtcHost: string;
  rtcApiPort: number;
  rtcWebrtcPort: number;
  rtcUseHttps: boolean;
  controlWsUrl: string;
  webrtcBaseUrl: string;
  easytierEndpoint: string;
  go2rtcCandidate: string;
  transportMode: "relay" | "p2p" | "auto";
  videoBitrateMbps: number;
  videoFps: number;
  videoResolution: string;
  iceServers: string;
}

export const DEFAULT_RUNTIME_CONFIG: RuntimeConfig = {
  exePath: "",
  startArgs: "",
  processName: "",
  rtcPreset: "manual",
  rtcHost: "",
  rtcApiPort: 1984,
  rtcWebrtcPort: 8555,
  rtcUseHttps: false,
  controlWsUrl: "",
  webrtcBaseUrl: "",
  easytierEndpoint: "",
  go2rtcCandidate: "127.0.0.1:8555",
  transportMode: "relay",
  videoBitrateMbps: 13,
  videoFps: 30,
  videoResolution: "1920x1080",
  iceServers: "",
};

const normalizeString = (value: unknown, fallback: string) => {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed || fallback;
};

const normalizeOptionalString = (value: unknown) => {
  if (typeof value !== "string") return "";
  return value.trim();
};

const stripTrailingSlash = (value: string) => value.replace(/\/+$/, "");

const normalizeUrl = (value: unknown, fallback: string, protocols: string[]) => {
  if (typeof value === "string" && value.trim() === "") return "";
  const normalizedValue = normalizeString(value, fallback);
  if (!normalizedValue) return "";

  try {
    const url = new URL(normalizedValue);
    if (!protocols.includes(url.protocol)) return fallback;
    return stripTrailingSlash(url.toString());
  } catch {
    return fallback;
  }
};

const normalizeEndpoint = (value: unknown, fallback: string) => {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (!trimmed) return "";

  try {
    const url = new URL(trimmed);
    if (url.protocol !== "tcp:" && url.protocol !== "udp:") return fallback;
    return url.toString();
  } catch {
    return fallback;
  }
};

const normalizeHostPort = (value: unknown, fallback: string) => {
  const candidate = normalizeString(value, fallback);
  if (/\s|["'`#{}[\]]/.test(candidate)) return fallback;
  if (!/^[a-zA-Z0-9.-]+:\d{1,5}$/.test(candidate)) return fallback;

  const port = Number(candidate.split(":").at(-1));
  if (!Number.isInteger(port) || port < 1 || port > 65535) return fallback;

  return candidate;
};

const normalizeIceServers = (value: unknown) => {
  if (typeof value !== "string") return DEFAULT_RUNTIME_CONFIG.iceServers;

  return value
    .split(/[\n,]/)
    .map((url) => url.trim())
    .filter(Boolean)
    .filter((url) => {
      try {
        const parsed = new URL(url);
        return ["stun:", "stuns:", "turn:", "turns:"].includes(parsed.protocol);
      } catch {
        return false;
      }
    })
    .join(",");
};

const normalizeNumber = (value: unknown, fallback: number, min: number, max: number) => {
  const numericValue = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numericValue)) return fallback;
  return Math.min(Math.max(numericValue, min), max);
};

const normalizeBoolean = (value: unknown, fallback: boolean) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (value === "true") return true;
    if (value === "false") return false;
  }
  return fallback;
};

const normalizeRtcPreset = (value: unknown): RuntimeConfig["rtcPreset"] => {
  if (value === "manual" || value === "local" || value === "vps" || value === "easytier") return value;
  return DEFAULT_RUNTIME_CONFIG.rtcPreset;
};

const normalizeHost = (value: unknown) => {
  if (typeof value !== "string") return "";
  const host = value.trim();
  if (!host || /\s|[/?#"'`{}[\]]/.test(host)) return "";
  return host;
};

const normalizeTransportMode = (value: unknown): RuntimeConfig["transportMode"] => {
  if (value === "p2p" || value === "auto" || value === "relay") return value;
  return DEFAULT_RUNTIME_CONFIG.transportMode;
};

const normalizeResolution = (value: unknown) => {
  const resolution = normalizeString(value, DEFAULT_RUNTIME_CONFIG.videoResolution).toLowerCase();
  return /^\d{3,5}x\d{3,5}$/.test(resolution) ? resolution : DEFAULT_RUNTIME_CONFIG.videoResolution;
};

export const normalizeRuntimeConfig = (
  value?: Partial<RuntimeConfig> | Record<string, unknown> | null,
): RuntimeConfig => {
  const input = value ?? {};
  const rtcPreset = normalizeRtcPreset(input.rtcPreset);
  const rtcHost = rtcPreset === "local" ? "127.0.0.1" : normalizeHost(input.rtcHost);
  const rtcApiPort = normalizeNumber(input.rtcApiPort, DEFAULT_RUNTIME_CONFIG.rtcApiPort, 1, 65535);
  const rtcWebrtcPort = normalizeNumber(input.rtcWebrtcPort, DEFAULT_RUNTIME_CONFIG.rtcWebrtcPort, 1, 65535);
  const rtcUseHttps = normalizeBoolean(input.rtcUseHttps, DEFAULT_RUNTIME_CONFIG.rtcUseHttps);
  const manualConfig = {
    webrtcBaseUrl: normalizeUrl(input.webrtcBaseUrl, DEFAULT_RUNTIME_CONFIG.webrtcBaseUrl, ["http:", "https:"]),
    go2rtcCandidate: normalizeHostPort(input.go2rtcCandidate, DEFAULT_RUNTIME_CONFIG.go2rtcCandidate),
  };
  const derivedRtcConfig = deriveRtcEndpoints({
    rtcPreset,
    rtcHost,
    rtcApiPort,
    rtcWebrtcPort,
    rtcUseHttps,
    webrtcBaseUrl: manualConfig.webrtcBaseUrl,
    go2rtcCandidate: manualConfig.go2rtcCandidate,
  });

  return {
    exePath: normalizeOptionalString(input.exePath),
    startArgs: typeof input.startArgs === "string" ? input.startArgs : DEFAULT_RUNTIME_CONFIG.startArgs,
    processName: typeof input.processName === "string" ? input.processName.trim() : DEFAULT_RUNTIME_CONFIG.processName,
    rtcPreset,
    rtcHost,
    rtcApiPort,
    rtcWebrtcPort,
    rtcUseHttps,
    controlWsUrl: normalizeUrl(input.controlWsUrl, DEFAULT_RUNTIME_CONFIG.controlWsUrl, ["ws:", "wss:"]),
    webrtcBaseUrl: derivedRtcConfig.webrtcBaseUrl,
    easytierEndpoint: normalizeEndpoint(input.easytierEndpoint, DEFAULT_RUNTIME_CONFIG.easytierEndpoint),
    go2rtcCandidate: derivedRtcConfig.go2rtcCandidate,
    transportMode: normalizeTransportMode(input.transportMode),
    videoBitrateMbps: normalizeNumber(input.videoBitrateMbps, DEFAULT_RUNTIME_CONFIG.videoBitrateMbps, 1, 100),
    videoFps: normalizeNumber(input.videoFps, DEFAULT_RUNTIME_CONFIG.videoFps, 1, 120),
    videoResolution: normalizeResolution(input.videoResolution),
    iceServers: normalizeIceServers(input.iceServers),
  };
};

export const deriveRtcEndpoints = (config: Pick<
  RuntimeConfig,
  "rtcPreset" | "rtcHost" | "rtcApiPort" | "rtcWebrtcPort" | "rtcUseHttps" | "webrtcBaseUrl" | "go2rtcCandidate"
>) => {
  if (config.rtcPreset === "manual") {
    return {
      webrtcBaseUrl: config.webrtcBaseUrl,
      go2rtcCandidate: config.go2rtcCandidate,
    };
  }

  const host = config.rtcPreset === "local" ? "127.0.0.1" : config.rtcHost.trim();
  if (!host) {
    return {
      webrtcBaseUrl: "",
      go2rtcCandidate: config.go2rtcCandidate,
    };
  }

  const scheme = config.rtcUseHttps ? "https" : "http";
  return {
    webrtcBaseUrl: `${scheme}://${host}:${config.rtcApiPort}`,
    go2rtcCandidate: `${host}:${config.rtcWebrtcPort}`,
  };
};

export const buildWebrtcStreamUrl = (webrtcBaseUrl: string, streamName: string) => {
  const normalizedBaseUrl = webrtcBaseUrl.trim();
  const path = `/api/webrtc?src=${encodeURIComponent(streamName)}`;

  if (!normalizedBaseUrl) return path;

  const baseUrl = stripTrailingSlash(normalizedBaseUrl);
  return `${baseUrl}${path}`;
};

export const buildControlWsUrl = (controlWsUrl?: string, locationLike?: Pick<Location, "protocol" | "host">) => {
  const configuredUrl = controlWsUrl?.trim();
  if (configuredUrl) return configuredUrl;

  const locationSource = locationLike ?? (typeof window !== "undefined" ? window.location : undefined);
  if (!locationSource) return "";

  const protocol = locationSource.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${locationSource.host}/control/`;
};

export const parseIceServers = (iceServers: string) => {
  return iceServers
    .split(/[\n,]/)
    .map((url) => url.trim())
    .filter(Boolean)
    .map((url) => ({ urls: url }));
};
