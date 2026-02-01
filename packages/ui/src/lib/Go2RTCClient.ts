// packages/ui/src/lib/Go2RTCClient.ts

// 定义状态类型，与组件保持一致
export type RTCConnectionState = 'idle' | 'connecting' | 'connected' | 'error';

export class Go2RTCClient {
  private pc: RTCPeerConnection | null = null;
  private videoElement: HTMLVideoElement;
  public onStateChange: ((state: RTCConnectionState, errorMsg?: string) => void) | null = null;
  
  // 【新增】增加一个标志位，标记是否已销毁
  private isDestroyed = false;

  constructor(videoElement: HTMLVideoElement) {
    this.videoElement = videoElement;
  }

  public async connect(streamUrl: string) {
    // 重置标志位
    this.isDestroyed = false;
    
    try {
      this.notifyState('connecting');
      console.log(`[Go2RTC] HTTP Connecting...`);

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
      });
      this.pc = pc;

      // ... 绑定 ontrack, onconnectionstatechange 等事件保持不变 ...
       // 这里的 iceConnectionState 也很重要，有时候 connectionState 还没变，ICE 已经通了
      pc.oniceconnectionstatechange = () => {
          if(pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
              this.notifyState('connected');
          }
      };

        pc.ontrack = (event) => {
        console.log("[Go2RTC] Received Track");
        // 收到流了，再次确认为 connected
        this.notifyState('connected');
        
        const stream = event.streams[0] || new MediaStream([event.track]);
        if (this.videoElement.srcObject !== stream) {
          this.videoElement.srcObject = stream;
          // 尝试播放，如果失败可能需要用户交互
          this.videoElement.play().catch(e => {
              console.error("AutoPlay blocked:", e);
              // 这里不报 error，因为连接其实是成功的，只是没自动播放
          });
        }
      };
      
      pc.addTransceiver("video", { direction: "recvonly" });

      const offer = await pc.createOffer();
      
      // 【检查点 1】如果在创建 Offer 期间被销毁了，直接退出
      if (this.isDestroyed) return;
      
      await pc.setLocalDescription(offer);

      const response = await fetch(streamUrl, {
        method: "POST",
        body: offer.sdp, 
      });

      // 【检查点 2】如果在网络请求期间被销毁了，直接退出，不要继续操作 pc
      if (this.isDestroyed) return;

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const answerSdp = await response.text();
      
      // 【检查点 3】最后一道防线
      if (this.isDestroyed || pc.signalingState === 'closed') return;

      await pc.setRemoteDescription({
        type: "answer",
        sdp: answerSdp,
      });
      
    } catch (e: any) {
      // 如果是因为销毁导致的报错，忽略它，不报 Error
      if (this.isDestroyed) return;

      console.error("[Go2RTC] Connect Failed:", e);
      this.notifyState('error', e.message);
    }
  }

  public disconnect() {
    // 【关键】标记为已销毁
    this.isDestroyed = true;

    this.pc?.close();
    this.pc = null;
    this.videoElement.srcObject = null;
    this.notifyState('idle');
  }
  
  // 辅助方法
  private notifyState(state: RTCConnectionState, msg?: string) {
      if (this.onStateChange) {
          this.onStateChange(state, msg);
      }
  }
}