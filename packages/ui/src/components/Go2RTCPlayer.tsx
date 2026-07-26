"use client"

import React, { useEffect, useRef } from "react";

import { buildWebrtcStreamUrl, DEFAULT_RUNTIME_CONFIG, parseIceServers } from "@workspace/config";

import { Go2RTCClient, RTCConnectionState, type WebRTCStatsSnapshot } from "../lib/Go2RTCClient";

interface Props {
  streamName: string;
  webrtcBaseUrl?: string;
  iceServers?: string;
  onStateChange?: (state: RTCConnectionState, msg?: string) => void;
  onStats?: (stats: WebRTCStatsSnapshot) => void;
}

export default function Go2RTCPlayer({
  streamName,
  webrtcBaseUrl = DEFAULT_RUNTIME_CONFIG.webrtcBaseUrl,
  iceServers = DEFAULT_RUNTIME_CONFIG.iceServers,
  onStateChange,
  onStats,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const clientRef = useRef<Go2RTCClient | null>(null);
  const callbackRef = useRef(onStateChange);
  const statsCallbackRef = useRef(onStats);

  useEffect(() => {
    callbackRef.current = onStateChange;
    statsCallbackRef.current = onStats;
  });

  useEffect(() => {
    if (!videoRef.current) return;

    if (clientRef.current) {
      clientRef.current.disconnect();
    }

    const client = new Go2RTCClient(videoRef.current);
    clientRef.current = client;

    client.onStateChange = (state, msg) => {
      callbackRef.current?.(state, msg);
    };
    client.onStats = (stats) => {
      statsCallbackRef.current?.(stats);
    };

    const streamUrl = buildWebrtcStreamUrl(webrtcBaseUrl, streamName);
    client.connect(streamUrl, { iceServers: parseIceServers(iceServers) });

    return () => {
      client.disconnect();
    };
  }, [streamName, webrtcBaseUrl, iceServers]);

  return (
    <div className="flex h-full w-full items-center justify-center bg-black">
      <video
        ref={videoRef}
        className="h-full w-full object-contain"
        autoPlay
        playsInline
        muted
        controls={false}
        style={{ pointerEvents: "none" }}
      />
    </div>
  );
}
