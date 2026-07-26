# CloudTest 3D 云渲染控制台

CloudTest 是一个 3D 云渲染控制台 monorepo。浏览器端观看 Go2RTC/WebRTC 实时画面，并通过控制面板把命令发送到本地或远端 3D 程序。

## 架构

```text
Browser
  ├─ WebRTC video ───────> Go2RTC -> ffmpeg/ddagrab -> screen capture
  └─ WebSocket control ──> Sidecar -> TCP 127.0.0.1:9999 -> p_cg / 3D App

PM2 manages:
  Web / EasyTier / Go2RTC / Sidecar / 3DApp
```

主要目录：

- `apps/web`：Next.js 控制台和管理页。
- `apps/sidecar`：控制信令/转发服务，监听 WebSocket 并转发到 3D App TCP 端口。
- `packages/config`：命令模板与运行时配置类型。
- `packages/ui`：Go2RTC 播放器、控制客户端和共享 UI。
- `configs/go2rtc.yaml`：Go2RTC 运行配置，由管理页保存配置时重写。
- `launcher.json`：本机运行配置；可参考 `launcher.example.json`。

## 环境要求

- Windows
- Node.js `>=20`
- pnpm `10.4.1`
- PM2
- `bin/go2rtc.exe`
- `bin/easytier-core.exe` 或 `bin/easytier-cli.exe`
- `bin/ffmpeg.exe`
- 支持 NVENC 的 NVIDIA GPU，用于当前默认 ffmpeg 参数

安装依赖：

```powershell
pnpm install
cd apps\sidecar
npm install
cd ..\..
npm install -g pm2
```

## 首次配置

复制示例配置：

```powershell
Copy-Item launcher.example.json launcher.json
```

然后启动 Web，打开管理页编辑配置：

```powershell
pnpm --filter web dev
```

访问：

```text
http://127.0.0.1:3000/admin
```

关键配置：

- `Executable Path`：3D App 的 `.exe` 路径。
- `Process Name`：任务管理器里的进程名，例如 `app__x64.exe`。
- `Control WebSocket URL`：留空时前端会按当前页面 host 派生 `ws(s)://host/control/`；本机调试可填 `ws://127.0.0.1:8888/`。
- `WebRTC Base URL`：留空时前端使用同源 `/api/webrtc`；本机直连 Go2RTC 可填 `http://127.0.0.1:1984`。
- `EasyTier Endpoint`：EasyTier 对端地址；没有中继/TUN 时可留空。
- `Go2RTC WebRTC Candidate`：Go2RTC 暴露给浏览器的 candidate，例如 `公网IP:8555` 或 `127.0.0.1:8555`。
- `Bitrate/FPS/Resolution`：会影响生成的 `configs/go2rtc.yaml`。

安全说明：

- 管理 API 默认只允许 `localhost` 访问。
- 远程管理时请设置强随机 token：

```powershell
$env:CLOUDTEST_ADMIN_TOKEN="your-strong-token"
$env:NEXT_PUBLIC_CLOUDTEST_ADMIN_TOKEN="your-strong-token"
```

## 启动方式

### 1. 开发模式

启动 Web：

```powershell
pnpm --filter web dev
```

单独启动控制信令/Sidecar：

```powershell
node apps\sidecar\sidecar.js
```

Sidecar 默认行为：

- WebSocket 监听：`127.0.0.1:8888`
- 转发目标：`127.0.0.1:9999`

可通过环境变量覆盖：

```powershell
$env:SIDECAR_WS_HOST="127.0.0.1"
$env:SIDECAR_WS_PORT="8888"
$env:PCG_HOST="127.0.0.1"
$env:PCG_PORT="9999"
node apps\sidecar\sidecar.js
```

单独启动 Go2RTC：

```powershell
.\bin\go2rtc.exe -c .\configs\go2rtc.yaml
```

### 2. PM2 生产模式

先构建 Web：

```powershell
pnpm --filter web build
```

启动所有进程：

```powershell
pm2 start .\ecosystem.config.js
pm2 list
```

查看日志：

```powershell
pm2 logs Web
pm2 logs Go2RTC
pm2 logs Sidecar
pm2 logs 3DApp
```

重启：

```powershell
pm2 restart Web
pm2 restart Go2RTC
pm2 restart Sidecar
pm2 restart 3DApp
```

停止：

```powershell
pm2 delete all
```

## 端口

| 服务 | 默认端口 | 说明 |
| --- | --- | --- |
| Web | `3000` | Next.js 控制台 |
| Sidecar WebSocket | `8888` | 浏览器控制信令入口 |
| p_cg / 3D App TCP | `9999` | Sidecar 转发目标 |
| Go2RTC API | `1984` | `/api/webrtc` HTTP offer 接口 |
| Go2RTC WebRTC | `8555` | WebRTC candidate |
| Go2RTC RTSP | `8554` | ffmpeg 推给 Go2RTC 的 RTSP |

如果远程访问，建议使用反向代理统一暴露 Web、Go2RTC API/WebRTC、Control WebSocket，避免浏览器连接自己的 `127.0.0.1`。

## 推流质量诊断

控制台顶部会显示 WebRTC 诊断指标：

- bitrate
- FPS
- RTT
- jitter
- packets lost
- frames dropped
- candidate type

完整测试流程见：

```text
docs/stream-diagnostics.md
```

快速判断：

- LAN 下也差：优先查采集、编码、GPU、ffmpeg 参数。
- `iperf3` 达不到目标码率：优先查带宽或运营商链路。
- Relay/TUN 稳定但 P2P 不稳定：P2P/ICE/NAT/BGP 路径是主要问题。
- `iperf3` 正常但 WebRTC 丢包高：优先查 ICE 路径、Go2RTC、WebRTC 拥塞控制。

## 常用排障

### PM2 报 Script not found

确认二进制存在：

```powershell
Get-ChildItem .\bin
```

至少需要：

- `go2rtc.exe`
- `ffmpeg.exe`
- `easytier-core.exe` 或 `easytier-cli.exe`

### Web 可以打开但视频失败

检查：

- `pm2 logs Go2RTC`
- `configs/go2rtc.yaml` 中 candidate 是否是浏览器可达地址。
- `/admin` 中 `WebRTC Base URL` 是否误填了观看者本机的 `127.0.0.1`。
- 浏览器诊断面板中的 candidate、RTT、jitter、loss。

### 控制按钮无效

检查：

- `pm2 logs Sidecar`
- Sidecar 是否能连接到 `127.0.0.1:9999`
- `/admin` 中 `Control WebSocket URL` 是否可从浏览器访问。
- 3D App 是否真的监听 TCP `9999`。

### 修改配置后不生效

配置保存会写入：

- `launcher.json`
- `configs/go2rtc.yaml`

保存后需要重启对应进程：

```powershell
pm2 restart Go2RTC
pm2 restart Sidecar
pm2 restart 3DApp
```

或在 `/admin` 点击重启服务。

## RTC Relay / VPS 配置模块

`/admin` 中的 `RTC Relay / VPS` 是当前统一配置入口，用来把 Go2RTC 观看地址和 WebRTC candidate 统筹到同一组参数。

可选模式：

- `Manual Advanced`：手动填写 `WebRTC Base URL` 和 `Go2RTC WebRTC Candidate`，适合已有反代或特殊拓扑。
- `Local Go2RTC`：自动使用 `127.0.0.1`，适合浏览器和渲染机在同一台机器上调试。
- `VPS Public Relay`：填写 VPS 公网 IP/域名，自动派生：
  - `WebRTC Base URL` = `http(s)://<RTC Host>:<API Port>`
  - `Go2RTC Candidate` = `<RTC Host>:<WebRTC Port>`
- `EasyTier / TUN IP`：填写 EasyTier/TUN 内网 IP，适合浏览器可直达虚拟网段的场景。

常见 VPS 配置示例：

```json
{
  "rtcPreset": "vps",
  "rtcHost": "203.0.113.10",
  "rtcApiPort": 1984,
  "rtcWebrtcPort": 8555,
  "rtcUseHttps": false
}
```

保存后会重写：

- `launcher.json`
- `configs/go2rtc.yaml`

然后重启：

```powershell
pm2 restart Go2RTC
pm2 restart Web
```

注意：这个模块当前配置的是“浏览器如何访问 Go2RTC/候选地址”。如果要做“渲染机主动把媒体推到 VPS，再由 VPS 分发”，还需要在 VPS 上部署媒体服务并新增 RTSP/SRT/WHIP 推流链路。
