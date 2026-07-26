# Stream Quality Diagnostics

Use this checklist to decide whether poor video quality is caused by bandwidth, encoding, or P2P/ICE routing.

## 1. LAN Baseline

- Put the render host and viewer on the same LAN.
- Use the same resolution, FPS, and bitrate as production.
- If LAN quality is poor, inspect capture, NVENC/GPU load, FPS, and Go2RTC before testing public networks.

## 2. Independent Bandwidth Test

Run an `iperf3` server on the relay/TUN host:

```powershell
iperf3 -s
```

Render host upstream test:

```powershell
iperf3 -c <relay-ip> -t 60 -P 4
```

Viewer downstream test:

```powershell
iperf3 -c <relay-ip> -t 60 -P 4 -R
```

UDP loss/jitter test at the target bitrate:

```powershell
iperf3 -c <relay-ip> -u -b 13M -t 60
```

For a 13 Mbps stream, prefer at least 25 Mbps stable headroom in both render-to-relay and relay-to-viewer directions.

## 3. Relay/TUN Forced Test

- Force the stream through the relay/TUN path.
- Record WebRTC diagnostics in the console overlay: bitrate, RTT, jitter, packet loss, dropped frames, candidate type.
- If relay is stable but P2P is not, treat P2P as a cost optimization, not the primary path.

## 4. P2P/Auto Test

- Restore P2P/auto mode.
- Watch selected candidate type: `host`, `srflx`, or `relay`.
- Frequent candidate changes, high jitter, or loss with good `iperf3` results points to ICE/NAT/BGP path problems.

## 5. Bitrate Ladder

Run each path at 4, 8, 13, and 20 Mbps for 2-3 minutes each. Record average bitrate, minimum bitrate, packet loss, jitter, dropped frames, and subjective quality.

## Decision Guide

- `iperf3` below target: bandwidth or ISP path problem.
- LAN poor: encoding/capture/GPU problem.
- Relay good, P2P poor: P2P/ICE path problem.
- Relay and P2P poor, but LAN good: public network capacity or relay sizing problem.
- WebRTC bitrate below configured bitrate while `iperf3` is healthy: inspect Go2RTC, codec, and browser WebRTC congestion control.
