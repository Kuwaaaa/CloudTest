// "use client"
// import React, { useEffect, useRef } from 'react';

// interface Props {
//     streamName: string; // 比如 'p_cg'
//     serverUrl: string;  // 比如 'http://123.60.85.133'
//     controlUrl: string; // 比如 'ws://123.60.85.133/control/'
// }

// export default function Go2RTCPlayer({ streamName, serverUrl, controlUrl }: Props) {
//     const videoRef = useRef<HTMLVideoElement>(null);
//     const pcRef = useRef<RTCPeerConnection | null>(null);
//     const wsRef = useRef<WebSocket | null>(null);

//     // 1. 初始化 WebRTC 视频流
//     useEffect(() => {
//         const startStream = async () => {
//             const pc = new RTCPeerConnection({
//                 iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
//             });
//             pcRef.current = pc;

//             // 创建一个只接收的 Transceiver
//             pc.addTransceiver('video', { direction: 'recvonly' });

//             // 处理轨道事件，把流给 video 标签
//             pc.ontrack = (event) => {
//                 if (videoRef.current) {
//                     videoRef.current.srcObject = event.streams[0];
//                 }
//             };

//             // 创建 Offer
//             const offer = await pc.createOffer();
//             await pc.setLocalDescription(offer);

//             // 发送 Offer 给 Go2RTC API，获取 Answer
//             // 注意：这里访问的是 VPS Nginx 代理后的地址
//             const res = await fetch(`${serverUrl}/api/ws?src=${streamName}`, {
//                 method: 'POST',
//                 body: offer.sdp
//             });

//             // Go2RTC 的 API 有点特殊，有些版本是 Websocket 握手，有些是 HTTP
//             // 推荐做法：直接用 Go2RTC 自带的 go2rtc.js 库，或者参考以下简易逻辑：

//             // === 简易版：直接复用 Go2RTC 的 client.js 逻辑 ===
//             // 为了不造轮子，最简单的办法其实是 iframe，如果你想完全自控：
//             // 请去下载 go2rtc 仓库里的 `www/video-rtc.js` 并改写。
//             // 这里为了演示，我展示最核心的逻辑：
//         };

//         // 【修正】推荐直接用 WebSocket 连接 Go2RTC 的信令通道，这是最稳的
//         // Go2RTC 提供了一个 ws 接口： /api/ws?src=p_cg
//         const wsUrl = serverUrl.replace('http', 'ws') + `/api/ws?src=${streamName}`;
//         const pc = new RTCPeerConnection();

//         const ws = new WebSocket(wsUrl);
//         ws.onopen = () => {
//             // Go2RTC 握手协议
//             const offer = pc.createOffer();
//             // ... 这里的握手逻辑稍微有点多，建议直接引入 go2rtc-client 库
//         };

//         // 这里为了让你立刻能跑起来，我建议先用 iframe 验证，然后去抄 Go2RTC 源码

//     }, [streamName, serverUrl]);

//     // 2. 初始化控制信令 (WebSocket)
//     useEffect(() => {
//         const ws = new WebSocket(controlUrl);
//         wsRef.current = ws;
//         return () => ws.close();
//     }, [controlUrl]);

//     // 3. 鼠标事件捕获
//     const handleMouseMove = (e: React.MouseEvent) => {
//         if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

//         const rect = e.currentTarget.getBoundingClientRect();
//         const x = (e.clientX - rect.left) / rect.width;
//         const y = (e.clientY - rect.top) / rect.height;

//         wsRef.current.send(JSON.stringify({
//             type: 'mousemove',
//             x, y
//         }));
//     };

//     const handleClick = () => {
//         if (wsRef.current) {
//             wsRef.current.send(JSON.stringify({ type: 'click' }));
//         }
//     };

//     return (
//         <div
//             className="relative w-full h-full bg-black"
//             onMouseMove={handleMouseMove}
//             onClick={handleClick}
//         >
//             {/*
//          临时方案：直接用 iframe 引用 VPS 的流地址
//          src="http://123.60.85.133/rtc/webrtc.html?src=p_cg"
//          把 iframe 设为 pointer-events-none，这样鼠标事件会穿透给外层的 div，
//          由 div 捕获并发送给 Sidecar
//       */}
//             <iframe
//                 src={`${serverUrl}/rtc/webrtc.html?src=${streamName}`}
//                 className="w-full h-full pointer-events-none border-none"
//                 allow="autoplay; fullscreen"
//             />
//         </div>
//     );
// }
