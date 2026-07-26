"use client"

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Settings, Terminal } from "lucide-react";

import { CreateCommandDialog } from "@/components/features/command-panel/CreateCommandDialog";
import {
  ALL_COMMANDS,
  buildControlWsUrl,
  CommandConfig,
  CommandService,
  type RuntimeConfig,
  type UserSavedCommand,
} from "@workspace/config";
import { Button } from "@workspace/ui/components/button";
import Go2RTCPlayer from "@workspace/ui/components/Go2RTCPlayer";
import { SmartCommandCard } from "@workspace/ui/components/SmartCommandCard";
import { ControlClient } from "@workspace/ui/lib/ControlClient";
import { type RTCConnectionState, type WebRTCStatsSnapshot } from "@workspace/ui/lib/Go2RTCClient";

interface Props {
  initialSavedCommands: UserSavedCommand[];
  initialRuntimeConfig: RuntimeConfig;
}

export default function CloudRenderClient({ initialSavedCommands, initialRuntimeConfig }: Props) {
  const [savedCommands, setSavedCommands] = useState<UserSavedCommand[]>(initialSavedCommands);
  const [connState, setConnState] = useState<RTCConnectionState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [isPanelVisible, setIsPanelVisible] = useState(true);
  const [playerKey, setPlayerKey] = useState(0);
  const [stats, setStats] = useState<WebRTCStatsSnapshot | null>(null);
  const controlRef = useRef<ControlClient | null>(null);

  useEffect(() => {
    const client = new ControlClient(buildControlWsUrl(initialRuntimeConfig.controlWsUrl));
    client.connect();
    controlRef.current = client;

    return () => {
      client.disconnect();
    };
  }, [initialRuntimeConfig.controlWsUrl]);

  const handleSendCommand = (json: any) => {
    controlRef.current?.send(json);
  };

  const refreshCommands = async () => {
    const data = await CommandService.list();
    setSavedCommands(data);
  };

  const handleStateChange = (state: RTCConnectionState, msg?: string) => {
    setConnState(state);
    if (msg) setErrorMsg(msg);
  };

  const retryPlayer = () => {
    setErrorMsg("");
    setStats(null);
    setConnState("idle");
    setPlayerKey((key) => key + 1);
  };

  const userCommandCards = savedCommands
    .map((saved) => {
      const template = ALL_COMMANDS.find((command) => command.name === saved.templateName);
      if (!template) return null;

      return {
        id: saved.id,
        config: {
          ...template,
          title: saved.title,
          defaultParams: saved.savedParams,
        } as CommandConfig,
      };
    })
    .filter(Boolean) as { id: string; config: CommandConfig }[];

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#0a0a0a] font-sans">
      <div className="absolute inset-0 z-0 flex items-center justify-center bg-black">
        <div className="absolute inset-0 border border-gray-500">
          <Go2RTCPlayer
            key={playerKey}
            streamName="p_cg"
            webrtcBaseUrl={initialRuntimeConfig.webrtcBaseUrl}
            iceServers={initialRuntimeConfig.iceServers}
            onStateChange={handleStateChange}
            onStats={setStats}
          />
        </div>

        {connState !== "connected" && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/80 text-white backdrop-blur-md animate-in fade-in">
            {(connState === "idle" || connState === "connecting") && (
              <div className="flex flex-col items-center gap-4">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500/30 border-t-blue-500" />
                <p className="font-mono text-sm tracking-widest text-blue-200">
                  CONNECTING TO RENDER SERVER...
                </p>
              </div>
            )}

            {connState === "error" && (
              <div className="flex flex-col items-center gap-4">
                <div className="text-5xl text-red-500">!</div>
                <h3 className="text-xl font-bold">Connection Failed</h3>
                <p className="rounded bg-red-950/50 px-4 py-2 font-mono text-red-300/70">
                  {errorMsg}
                </p>
                <div className="flex gap-2">
                  <Button
                    onClick={retryPlayer}
                    variant="outline"
                    className="border-white/20 bg-white/10 text-white hover:bg-white/20"
                  >
                    Retry
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="border-white/20 bg-white/10 text-white hover:bg-white/20"
                  >
                    <Link href="/admin">Open Settings</Link>
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="pointer-events-none absolute left-0 top-0 z-10 flex w-full items-start justify-between p-6">
        <div className="pointer-events-auto rounded-full border border-white/10 bg-black/60 px-4 py-2 font-mono text-sm text-white backdrop-blur-md">
          <span className="mr-2 inline-block h-2 w-2 animate-pulse rounded-full bg-green-500"></span>
          Stream: {initialRuntimeConfig.transportMode} / {initialRuntimeConfig.videoBitrateMbps}Mbps
        </div>

        <div className="pointer-events-auto max-w-md rounded-lg border border-white/10 bg-black/60 p-3 font-mono text-[11px] text-white/80 backdrop-blur-md">
          <div className="mb-2 font-semibold text-white">Network Diagnostics</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <span>Bitrate</span><span>{stats ? `${stats.bitrateMbps.toFixed(2)} Mbps` : "--"}</span>
            <span>FPS</span><span>{stats ? stats.framesPerSecond.toFixed(0) : "--"}</span>
            <span>RTT</span><span>{stats ? `${stats.roundTripTimeMs.toFixed(0)} ms` : "--"}</span>
            <span>Jitter</span><span>{stats ? `${stats.jitterMs.toFixed(1)} ms` : "--"}</span>
            <span>Lost</span><span>{stats ? stats.packetsLost : "--"}</span>
            <span>Dropped</span><span>{stats ? stats.framesDropped : "--"}</span>
            <span>Candidate</span><span>{stats?.candidateType ?? "--"}</span>
            <span>Test Modes</span><span>LAN / Relay / P2P</span>
          </div>
          <div className="mt-2 text-white/50">Run 4/8/13/20 Mbps tests and compare iperf3 vs WebRTC stats.</div>
        </div>

        <div className="pointer-events-auto flex items-center gap-2">
          <div className="rounded-lg border border-white/10 bg-black/60 p-2 backdrop-blur-md">
            <Terminal className="h-5 w-5 text-white/60" />
          </div>
          <Button
            asChild
            variant="outline"
            size="icon"
            className="border-white/10 bg-black/60 text-white hover:bg-white/10"
          >
            <Link href="/admin" aria-label="Open settings">
              <Settings className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      <div
        className={`
          absolute bottom-0 w-full z-20
          transition-transform duration-500 cubic-bezier(0.4, 0, 0.2, 1)
          ${isPanelVisible ? "translate-y-0" : "translate-y-full"}
        `}
      >
        <div className="pointer-events-none absolute -top-10 flex w-full justify-center">
          <button
            onClick={() => setIsPanelVisible(!isPanelVisible)}
            className="
              pointer-events-auto
              flex h-10 items-center justify-center gap-2 px-8
              rounded-t-xl border-x border-t border-white/10
              bg-black/80 text-white/70 shadow-[0_-5px_15px_rgba(0,0,0,0.3)]
              backdrop-blur-xl transition-all duration-300
              hover:bg-primary/80 hover:text-white
              group
            "
          >
            {isPanelVisible ? (
              <>
                <span className="translate-x-2 -ml-4 text-[10px] font-bold tracking-widest opacity-0 transition-opacity group-hover:translate-x-0 group-hover:opacity-100">
                  HIDE
                </span>
                <ChevronDown className="h-5 w-5 animate-bounce-slow" />
              </>
            ) : (
              <>
                <ChevronUp className="h-5 w-5 -translate-y-0.5" />
                <span className="text-[10px] font-bold tracking-widest">CONTROLS</span>
              </>
            )}
          </button>
        </div>

        <div className="relative w-full border-t border-white/10 bg-[#0a0a0a]/90 pb-6 pt-2 backdrop-blur-xl">
          <div className="absolute left-0 top-0 h-[1px] w-full bg-gradient-to-r from-transparent via-white/20 to-transparent" />

          <div className="relative px-6 py-6 md:px-10">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
              {ALL_COMMANDS.map((cmd, index) => (
                <SmartCommandCard key={`preset-${index}`} data={cmd} sendCommand={handleSendCommand} />
              ))}

              {userCommandCards.map((item) => (
                <SmartCommandCard key={item.id} data={item.config} sendCommand={handleSendCommand} />
              ))}

              <CreateCommandDialog onCreated={refreshCommands} />
            </div>
          </div>

          <div className="h-4 w-full" />
        </div>
      </div>
    </div>
  );
}
