"use client"

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertCircle, RotateCcw, Save } from "lucide-react";

import { adminFetchHeaders } from "@/lib/admin-client";
import { DEFAULT_RUNTIME_CONFIG, deriveRtcEndpoints, type RuntimeConfig } from "@workspace/config";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";

export default function AdminPage() {
  const [config, setConfig] = useState<RuntimeConfig>(DEFAULT_RUNTIME_CONFIG);
  const [loading, setLoading] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isPendingRestart, setIsPendingRestart] = useState(false);

  useEffect(() => {
    fetch("/api/admin/config", { headers: adminFetchHeaders() })
      .then((res) => res.json())
      .then((data) => {
        setConfig({ ...DEFAULT_RUNTIME_CONFIG, ...data });
        setIsDirty(false);
      });
  }, []);

  const handleInputChange = (field: keyof RuntimeConfig, value: RuntimeConfig[keyof RuntimeConfig]) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const rtcPreview = deriveRtcEndpoints(config);

  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/config", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...adminFetchHeaders() },
        body: JSON.stringify(config),
      });
      if (!response.ok) throw new Error("Save failed");
      setIsDirty(false);
      setIsPendingRestart(true);
    } catch {
      alert("淇濆瓨澶辫触");
    }
    setLoading(false);
  };

  const handleRestart = async () => {
    if (!confirm("确定要重启 3D 服务吗？当前所有连接将会断开。")) return;

    setLoading(true);
    try {
      const response = await fetch("/api/admin/restart", { method: "POST", headers: adminFetchHeaders() });
      if (!response.ok) throw new Error("Restart failed");
      setIsPendingRestart(false);
      alert("重启指令已发送，服务正在重新加载...");
    } catch {
      alert("重启失败");
    }
    setLoading(false);
  };

  return (
    <div className="relative min-h-screen w-screen overflow-hidden bg-[#0a0a0a] font-sans">
      <div className="mx-auto max-w-2xl p-10 text-white">
        <div className="mb-6 flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold">Render Settings</h1>
          <Button asChild variant="outline" className="border-white/20 text-white hover:bg-white/10">
            <Link href="/">返回控制台</Link>
          </Button>
        </div>

        {isPendingRestart && (
          <div className="mb-6 flex items-center justify-between rounded-lg border border-yellow-500/50 bg-yellow-500/20 p-3 text-yellow-200 animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">配置已更新，需要重启后生效</span>
            </div>
            <Button
              onClick={handleRestart}
              size="sm"
              variant="destructive"
              className="h-7 border-none bg-yellow-600 text-xs text-white hover:bg-yellow-700"
            >
              立即重启
            </Button>
          </div>
        )}

        <div className="space-y-6 rounded-xl border border-white/10 bg-white/5 p-6">
          <section className="space-y-4">
            <h2 className="text-sm font-semibold text-white">3D App</h2>

            <div>
              <label className="mb-1 block text-sm text-gray-400">Executable Path (.exe)</label>
              <Input
                value={config.exePath}
                onChange={(e) => handleInputChange("exePath", e.target.value)}
                placeholder="C:\\Program Files\\MyApp\\app.exe"
                className="border-white/10 bg-black/20"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-gray-400">Process Name (Task Manager)</label>
              <Input
                value={config.processName}
                onChange={(e) => handleInputChange("processName", e.target.value)}
                placeholder="MyGame.exe"
                className="border-white/10 bg-black/20"
              />
              <p className="mt-1 text-[10px] text-gray-500">
                任务管理器中显示的真实进程名，用于保活监控。
              </p>
            </div>

            <div>
              <label className="mb-1 block text-sm text-gray-400">Launch Arguments</label>
              <Input
                value={config.startArgs}
                onChange={(e) => handleInputChange("startArgs", e.target.value)}
                placeholder="-windowed -resX 1920"
                className="border-white/10 bg-black/20"
              />
            </div>
          </section>

          <section className="space-y-4 border-t border-white/10 pt-2">
            <h2 className="text-sm font-semibold text-white">RTC Relay / VPS</h2>

            <div>
              <label className="mb-1 block text-sm text-gray-400">RTC Preset</label>
              <select
                value={config.rtcPreset}
                onChange={(e) => handleInputChange("rtcPreset", e.target.value as RuntimeConfig["rtcPreset"])}
                className="h-10 w-full rounded-md border border-white/10 bg-black/20 px-3 text-sm text-white"
              >
                <option value="manual">Manual Advanced</option>
                <option value="local">Local Go2RTC</option>
                <option value="vps">VPS Public Relay</option>
                <option value="easytier">EasyTier / TUN IP</option>
              </select>
              <p className="mt-1 text-[10px] text-gray-500">
                Use VPS Public Relay when viewers should connect through a public server. Manual keeps the advanced URLs below.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm text-gray-400">RTC Host</label>
                <Input
                  value={config.rtcHost}
                  onChange={(e) => handleInputChange("rtcHost", e.target.value)}
                  placeholder="VPS public IP/domain or EasyTier IP"
                  disabled={config.rtcPreset === "local" || config.rtcPreset === "manual"}
                  className="border-white/10 bg-black/20 disabled:opacity-50"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-gray-400">API Port</label>
                <Input
                  type="number"
                  min="1"
                  max="65535"
                  value={config.rtcApiPort}
                  onChange={(e) => handleInputChange("rtcApiPort", Number(e.target.value))}
                  disabled={config.rtcPreset === "manual"}
                  className="border-white/10 bg-black/20 disabled:opacity-50"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-gray-400">WebRTC Port</label>
                <Input
                  type="number"
                  min="1"
                  max="65535"
                  value={config.rtcWebrtcPort}
                  onChange={(e) => handleInputChange("rtcWebrtcPort", Number(e.target.value))}
                  disabled={config.rtcPreset === "manual"}
                  className="border-white/10 bg-black/20 disabled:opacity-50"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm text-gray-400">Viewer Protocol</label>
              <select
                value={config.rtcUseHttps ? "https" : "http"}
                onChange={(e) => handleInputChange("rtcUseHttps", e.target.value === "https")}
                disabled={config.rtcPreset === "manual"}
                className="h-10 w-full rounded-md border border-white/10 bg-black/20 px-3 text-sm text-white disabled:opacity-50"
              >
                <option value="http">HTTP / WS</option>
                <option value="https">HTTPS / WSS</option>
              </select>
            </div>

            <div className="rounded-md border border-white/10 bg-black/20 p-3 font-mono text-[11px] text-white/70">
              <div>Derived WebRTC Base: {rtcPreview.webrtcBaseUrl || "(same-origin / manual)"}</div>
              <div>Derived Candidate: {rtcPreview.go2rtcCandidate}</div>
            </div>
          </section>

          <section className="space-y-4 border-t border-white/10 pt-2">
            <h2 className="text-sm font-semibold text-white">Frontend Endpoints</h2>

            <div>
              <label className="mb-1 block text-sm text-gray-400">Control WebSocket URL</label>
              <Input
                value={config.controlWsUrl}
                onChange={(e) => handleInputChange("controlWsUrl", e.target.value)}
                placeholder="Leave empty to derive ws(s)://current-host/control/"
                className="border-white/10 bg-black/20"
              />
              <p className="mt-1 text-[10px] text-gray-500">Leave empty for same-host reverse proxy; use localhost only for local debugging.</p>
            </div>

            <div>
              <label className="mb-1 block text-sm text-gray-400">WebRTC Base URL</label>
              <Input
                value={config.webrtcBaseUrl}
                onChange={(e) => handleInputChange("webrtcBaseUrl", e.target.value)}
                placeholder="Leave empty to use same-origin /api/webrtc"
                className="border-white/10 bg-black/20"
              />
              <p className="mt-1 text-[10px] text-gray-500">Remote browsers should not use 127.0.0.1 unless Go2RTC runs on the viewer machine.</p>
            </div>
          </section>

          <section className="space-y-4 border-t border-white/10 pt-2">
            <h2 className="text-sm font-semibold text-white">Service Endpoints</h2>

            <div>
              <label className="mb-1 block text-sm text-gray-400">EasyTier Endpoint</label>
              <Input
                value={config.easytierEndpoint}
                onChange={(e) => handleInputChange("easytierEndpoint", e.target.value)}
                placeholder="tcp://123.60.85.133:11010"
                className="border-white/10 bg-black/20"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-gray-400">Go2RTC WebRTC Candidate</label>
              <Input
                value={config.go2rtcCandidate}
                onChange={(e) => handleInputChange("go2rtcCandidate", e.target.value)}
                placeholder="123.60.85.133:8555"
                className="border-white/10 bg-black/20"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-gray-400">Transport Mode</label>
              <select
                value={config.transportMode}
                onChange={(e) => handleInputChange("transportMode", e.target.value as RuntimeConfig["transportMode"])}
                className="h-10 w-full rounded-md border border-white/10 bg-black/20 px-3 text-sm text-white"
              >
                <option value="relay">Relay / TUN First</option>
                <option value="auto">Auto Fallback</option>
                <option value="p2p">P2P First</option>
              </select>
              <p className="mt-1 text-[10px] text-gray-500">
                国内网络建议默认 Relay / TUN First，P2P 只作为降成本优化。
              </p>
            </div>

            <div>
              <label className="mb-1 block text-sm text-gray-400">ICE Servers</label>
              <Input
                value={config.iceServers}
                onChange={(e) => handleInputChange("iceServers", e.target.value)}
                placeholder="stun:stun.example.com:3478,turn:turn.example.com:3478"
                className="border-white/10 bg-black/20"
              />
              <p className="mt-1 text-[10px] text-gray-500">
                多个地址用逗号分隔；Relay 模式可留空以减少国内 STUN 依赖。
              </p>
            </div>
          </section>

          <section className="space-y-4 border-t border-white/10 pt-2">
            <h2 className="text-sm font-semibold text-white">Video Encoding</h2>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm text-gray-400">Bitrate (Mbps)</label>
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={config.videoBitrateMbps}
                  onChange={(e) => handleInputChange("videoBitrateMbps", Number(e.target.value))}
                  className="border-white/10 bg-black/20"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-gray-400">FPS</label>
                <Input
                  type="number"
                  min="1"
                  max="120"
                  value={config.videoFps}
                  onChange={(e) => handleInputChange("videoFps", Number(e.target.value))}
                  className="border-white/10 bg-black/20"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-gray-400">Resolution</label>
                <Input
                  value={config.videoResolution}
                  onChange={(e) => handleInputChange("videoResolution", e.target.value)}
                  placeholder="1920x1080"
                  className="border-white/10 bg-black/20"
                />
              </div>
            </div>
          </section>

          <div className="flex gap-3 border-t border-white/10 pt-4">
            <Button
              onClick={handleSave}
              disabled={loading || !isDirty}
              className="flex-1 gap-2"
            >
              <Save className="h-4 w-4" />
              {isDirty ? "保存配置" : "已保存"}
            </Button>

            <Button
              onClick={handleRestart}
              disabled={loading}
              variant="outline"
              className="flex-1 gap-2 border-white/20 text-white hover:bg-white/10"
            >
              <RotateCcw className="h-4 w-4" />
              重启服务
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
