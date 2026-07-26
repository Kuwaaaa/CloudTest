export type RTCConnectionState = "idle" | "connecting" | "connected" | "error";

export interface Go2RTCConnectOptions {
  iceServers?: RTCIceServer[];
  statsIntervalMs?: number;
}

export interface WebRTCStatsSnapshot {
  timestamp: number;
  bitrateMbps: number;
  framesPerSecond: number;
  framesDropped: number;
  packetsLost: number;
  packetsReceived: number;
  jitterMs: number;
  roundTripTimeMs: number;
  candidateType: string;
  localCandidateType: string;
  remoteCandidateType: string;
}

const EMPTY_STATS: WebRTCStatsSnapshot = {
  timestamp: 0,
  bitrateMbps: 0,
  framesPerSecond: 0,
  framesDropped: 0,
  packetsLost: 0,
  packetsReceived: 0,
  jitterMs: 0,
  roundTripTimeMs: 0,
  candidateType: "unknown",
  localCandidateType: "unknown",
  remoteCandidateType: "unknown",
};

export class Go2RTCClient {
  private pc: RTCPeerConnection | null = null;
  private videoElement: HTMLVideoElement;
  private isDestroyed = false;
  private connectionId = 0;
  private abortController: AbortController | null = null;
  private statsTimer: ReturnType<typeof setInterval> | null = null;
  private lastBytesReceived = 0;
  private lastStatsTimestamp = 0;

  public onStateChange: ((state: RTCConnectionState, errorMsg?: string) => void) | null = null;
  public onStats: ((stats: WebRTCStatsSnapshot) => void) | null = null;

  constructor(videoElement: HTMLVideoElement) {
    this.videoElement = videoElement;
  }

  public async connect(streamUrl: string, options: Go2RTCConnectOptions = {}) {
    this.disconnect(false);

    this.isDestroyed = false;
    const activeConnectionId = ++this.connectionId;
    const abortController = new AbortController();
    this.abortController = abortController;

    try {
      this.notifyState("connecting");

      const pc = new RTCPeerConnection({
        iceServers: options.iceServers ?? [],
      });
      this.pc = pc;

      const isActive = () => !this.isDestroyed && this.connectionId === activeConnectionId && this.pc === pc;

      pc.oniceconnectionstatechange = () => {
        if (!isActive()) return;
        if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
          this.notifyState("connected");
        }
      };

      pc.ontrack = (event) => {
        if (!isActive()) return;
        this.notifyState("connected");

        const stream = event.streams[0] || new MediaStream([event.track]);
        if (this.videoElement.srcObject !== stream) {
          this.videoElement.srcObject = stream;
          this.videoElement.play().catch((error) => {
            console.error("AutoPlay blocked:", error);
          });
        }
      };

      pc.addTransceiver("video", { direction: "recvonly" });

      const offer = await pc.createOffer();
      if (!isActive()) return;

      await pc.setLocalDescription(offer);

      const response = await fetch(streamUrl, {
        method: "POST",
        body: offer.sdp,
        signal: abortController.signal,
      });

      if (!isActive()) return;
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const answerSdp = await response.text();
      if (!isActive() || pc.signalingState === "closed") return;

      await pc.setRemoteDescription({
        type: "answer",
        sdp: answerSdp,
      });

      this.startStatsLoop(pc, activeConnectionId, options.statsIntervalMs ?? 1500);
    } catch (error) {
      if (this.isDestroyed || abortController.signal.aborted) return;
      console.error("[Go2RTC] Connect Failed:", error);
      this.notifyState("error", error instanceof Error ? error.message : "Connection failed");
    }
  }

  public disconnect(notify = true) {
    this.isDestroyed = true;
    this.connectionId += 1;
    this.abortController?.abort();
    this.abortController = null;
    this.stopStatsLoop();
    this.pc?.close();
    this.pc = null;
    this.videoElement.srcObject = null;

    if (notify) this.notifyState("idle");
  }

  private startStatsLoop(pc: RTCPeerConnection, connectionId: number, intervalMs: number) {
    this.stopStatsLoop();
    this.lastBytesReceived = 0;
    this.lastStatsTimestamp = 0;

    this.statsTimer = setInterval(() => {
      void this.collectStats(pc, connectionId);
    }, intervalMs);
  }

  private stopStatsLoop() {
    if (this.statsTimer) clearInterval(this.statsTimer);
    this.statsTimer = null;
  }

  private async collectStats(pc: RTCPeerConnection, connectionId: number) {
    if (this.isDestroyed || this.connectionId !== connectionId || this.pc !== pc) return;

    const report = await pc.getStats();
    const snapshot = { ...EMPTY_STATS, timestamp: Date.now() };
    let activeCandidatePair: RTCStats | undefined;

    report.forEach((stats) => {
      const entry = stats as RTCStats & Record<string, any>;

      if (entry.type === "inbound-rtp" && entry.kind === "video") {
        const elapsedSeconds = this.lastStatsTimestamp
          ? Math.max((entry.timestamp - this.lastStatsTimestamp) / 1000, 0.001)
          : 0;
        const byteDelta = this.lastBytesReceived ? Math.max((entry.bytesReceived ?? 0) - this.lastBytesReceived, 0) : 0;

        snapshot.bitrateMbps = elapsedSeconds ? (byteDelta * 8) / elapsedSeconds / 1_000_000 : 0;
        snapshot.framesPerSecond = Number(entry.framesPerSecond ?? 0);
        snapshot.framesDropped = Number(entry.framesDropped ?? 0);
        snapshot.packetsLost = Number(entry.packetsLost ?? 0);
        snapshot.packetsReceived = Number(entry.packetsReceived ?? 0);
        snapshot.jitterMs = Number(entry.jitter ?? 0) * 1000;

        this.lastBytesReceived = Number(entry.bytesReceived ?? 0);
        this.lastStatsTimestamp = Number(entry.timestamp ?? 0);
      }

      if (entry.type === "candidate-pair" && (entry.nominated || entry.state === "succeeded") && entry.currentRoundTripTime !== undefined) {
        activeCandidatePair = entry;
        snapshot.roundTripTimeMs = Number(entry.currentRoundTripTime ?? 0) * 1000;
      }
    });

    if (activeCandidatePair) {
      const pair = activeCandidatePair as RTCStats & Record<string, any>;
      const local = report.get(pair.localCandidateId) as (RTCStats & Record<string, any>) | undefined;
      const remote = report.get(pair.remoteCandidateId) as (RTCStats & Record<string, any>) | undefined;
      snapshot.localCandidateType = String(local?.candidateType ?? "unknown");
      snapshot.remoteCandidateType = String(remote?.candidateType ?? "unknown");
      snapshot.candidateType = `${snapshot.localCandidateType}/${snapshot.remoteCandidateType}`;
    }

    this.onStats?.(snapshot);
  }

  private notifyState(state: RTCConnectionState, msg?: string) {
    this.onStateChange?.(state, msg);
  }
}
