// app/api/lark/CloudRenderPlayer.tsx
"use client"
import React, { useEffect, useRef } from 'react';
import Script from 'next/script'; // 别忘了这个
import { larkManager } from '@workspace/ui/lib/LarkManager'; // 导入单例

interface PlayerProps {
  serverAddress: string;
  authCode: string;
  appliId: string;
  onStateChange?: (state: string, msg?: string) => void;
}

export default function CloudRenderPlayer({
  serverAddress, authCode, appliId, onStateChange
}: PlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // 脚本加载完毕后，开始连接
  const handleScriptLoad = () => {
    larkManager.connect({ serverAddress, authCode, appliId });
  };

  useEffect(() => {
    // 1. 订阅状态变化
    const unsubscribe = larkManager.subscribe((state, msg) => {
      onStateChange?.(state, msg);
    });

    // 2. 如果是热重载或重新挂载，尝试连接（如果 window.larksr 已经有了）
    if (typeof window !== 'undefined' && window.larksr_websdk) {
      larkManager.connect({ serverAddress, authCode, appliId });
    }

    // 3. 挂载画面到当前 DIV
    if (containerRef.current) {
      larkManager.mountTo(containerRef.current);
    }

    return () => unsubscribe();
    // 注意：这里不 destroy，保持单例存活
  }, [serverAddress, authCode, appliId]);

  return (
    <>
      <Script
        src="/js/larksr-web-sdk.min.js"
        strategy="afterInteractive"
        onLoad={handleScriptLoad}
      />
      <div
        ref={containerRef}
        style={{ width: '100%', height: '100%', background: 'black' }}
      />
    </>
  );
}
