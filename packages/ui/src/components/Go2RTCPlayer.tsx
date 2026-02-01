"use client"
import React, { useEffect, useRef } from 'react';
import { Go2RTCClient, RTCConnectionState } from '../lib/Go2RTCClient';

interface Props {
    streamName: string;
    onStateChange?: (state: RTCConnectionState, msg?: string) => void;
}

export default function Go2RTCPlayer({ streamName, onStateChange }: Props) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const clientRef = useRef<Go2RTCClient | null>(null);

    // 【关键修改 1】使用 useRef 保存回调函数
    // 这样无论父组件怎么重渲染，callbackRef 都是稳定的，不会触发 useEffect
    const callbackRef = useRef(onStateChange);

    // 每次渲染都更新 ref 的值
    useEffect(() => {
        callbackRef.current = onStateChange;
    });

    useEffect(() => {
        if (!videoRef.current) return;

        // 1. 先清理之前的（如果有）
        if (clientRef.current) {
            clientRef.current.disconnect();
        }

        const client = new Go2RTCClient(videoRef.current);
        clientRef.current = client;

        client.onStateChange = (state, msg) => {
            // 【关键修改 2】通过 ref 调用，打破依赖闭环
            if (callbackRef.current) {
                callbackRef.current(state, msg);
            }
        };

        // const streamUrl = `http://127.0.0.1:1984/api/webrtc?src=${streamName}`;
        const streamUrl = `http://123.60.85.133/api/webrtc?src=${streamName}`;
        console.log("[Player] Init Connection to:", streamName);

        client.connect(streamUrl);

        return () => {
            client.disconnect();
        };

        // 【关键修改 3】依赖数组里只留 streamName
        // 绝对不要把 onStateChange 放进来！
    }, [streamName]);

    return (
        <div className="w-full h-full bg-black flex items-center justify-center">
            <video
                ref={videoRef}
                className="w-full h-full object-contain"
                autoPlay
                playsInline
                muted
                controls={false}
                style={{ pointerEvents: 'none' }}
            />
        </div>
    );
}
