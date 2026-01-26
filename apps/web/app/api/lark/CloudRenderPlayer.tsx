"use client"

import React, { useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import { log } from 'console';

declare global {
  interface Window {
    larksr_websdk: any;
    pxy_webcommonui: any;
  }
}

interface CloudRenderPlayerProps {
  serverAddress: string;
  authCode: string;
  appliId: string;
  onConnect?: () => void;
  onError?: (err: any) => void;
  onStateChange?: (state: 'idle' | 'connecting' | 'connected' | 'error', msg?: string) => void;
}

export default function CloudRenderPlayer({
  serverAddress,
  authCode,
  appliId,
  onConnect,
  onError,
  onStateChange
}: CloudRenderPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const joystickContainerRef = useRef<HTMLDivElement>(null);
  const keyboardContainerRef = useRef<HTMLDivElement>(null);

  const clientRef = useRef<any>(null);
  const joystickRef = useRef<any>(null);
  const keyboardRef = useRef<any>(null);

  const [isSdkLoaded, setIsSdkLoaded] = useState(false);

  const initLarkSR = () => {
    // 1. 严格守卫：参数不全坚决不跑
    if (!serverAddress || !authCode || !appliId) return;
    if (!window.larksr_websdk || !containerRef.current) return;

    // 2. 单例守卫：已经连上了就别再连了
    if (clientRef.current) return;

    try {
      // 1. 通知父组件：开始连接
      onStateChange?.('connecting');
      console.log("🚀 Starting LarkSR Init with:", { serverAddress, authCode, appliId });

      const LarkSR = window.larksr_websdk.LarkSR;
      const client = new LarkSR({
        rootElement: containerRef.current,
        serverAddress: serverAddress,
      });

      clientRef.current = client;

      bindClientEvents(client);

      client.initSDKAuthCode(authCode)
        .then(() => {
          console.log('✅ Auth success, connecting...');
          return client.connect({ appliId: appliId });
        })
        .then(() => {
          console.log('🎉 Enter App success');
          onStateChange?.('connected');
          onConnect?.();
        })
        .catch((e: any) => {
          console.error('❌ Connection Failed:', e);
          console.log({
            "serverAddress": serverAddress,
            "authCode": authCode,
            "appliId": appliId
          });

          onError?.(e.message || "Connection Failed");
          onStateChange?.('error', e.message || "连接过程失败");
          // 如果连接失败，是否需要重置 clientRef 以便允许重试？
          // clientRef.current = null; // 可选：开启这行允许失败后重试
        });

    } catch (e: any) {
      console.error('💥 Init Error:', e);
      onError?.(e.message || "Init Error");
      onStateChange?.('error', e.message || "初始化崩溃");
    }
  };

  const bindClientEvents = (client: any) => {
    client.on('connect', (e: any) => console.log("LarkSR: connect"));
    client.on('mediaplaysuccess', () => {
      console.log("LarkSR: mediaplaysuccess");
      if (joystickRef.current) joystickRef.current.show();
    });
    client.on('apprequestinput', (e: any) => {
      if (window.pxy_webcommonui?.Capabilities?.isMobile && keyboardRef.current) {
        e.data === true ? keyboardRef.current.show() : keyboardRef.current.hide();
      }
    });
    client.on('error', (e: any) => {
      const msg = e.message || e.code || "Runtime Error";
      console.error("LarkSR Error:", msg);
      onError?.(msg);
    });
  };

  const initUIComponents = () => {
    if (!window.pxy_webcommonui || !clientRef.current) return;
    // ... UI 初始化代码保持不变 ...
  };

  // 资源清理
  useEffect(() => {
    return () => {
      if (clientRef.current) {
        console.log("👋 Destroying LarkSR client...");
        try { clientRef.current.close(); } catch (e) { }
        clientRef.current = null;
      }
    };
  }, []);

  // -----------------------------------------------------
  // 核心修复点：依赖项加入 props
  // -----------------------------------------------------
  useEffect(() => {
    const isReady = isSdkLoaded && serverAddress && authCode && appliId;

    if (isReady) {
      initLarkSR();
      initUIComponents();
    } else {
      console.log("⏳ Waiting for props...", { isSdkLoaded, serverAddress, authCode, appliId });
    }
    // 监听所有参数的变化
  }, [isSdkLoaded, serverAddress, authCode, appliId]);

  return (
    <>
      <Script src="/js/pxy_webcommonui.min.js" strategy="lazyOnload" />
      <Script
        src="/js/larksr-web-sdk.min.js"
        strategy="lazyOnload"
        onLoad={() => {
          console.log("📦 SDK Loaded");
          setIsSdkLoaded(true);
        }}
      />
      <div className="relative w-full h-full bg-black overflow-hidden select-none">
        <div ref={containerRef} id="lark-container" className="absolute inset-0 z-0" />
        {/* UI 层代码保持不变 */}
      </div>
    </>
  );
}