// packages/ui/src/lib/LarkManager.ts
export interface LarkConfig {
  serverAddress: string;
  authCode: string;
  appliId: string;
}

type StateChangeHandler = (state: 'idle' | 'connecting' | 'connected' | 'error', msg?: string) => void;

class LarkManager {
  private static instance: LarkManager;
  public larkClient: any | null = null;
  private stateListeners: StateChangeHandler[] = [];
  private _isConnected = false;
  private _detachedRoot: HTMLElement | null = null; 

  private constructor() {
    // 在构造函数里就创建好这个 div，保证它永远存在
    if (typeof document !== 'undefined') {
        this._detachedRoot = document.createElement('div');
        this._detachedRoot.style.width = '100%';
        this._detachedRoot.style.height = '100%';
        this._detachedRoot.style.background = 'black'; // 设个背景色方便调试
    } else {
        this._detachedRoot = null as any;
    }
  }

  public static getInstance(): LarkManager {
    if (!LarkManager.instance) {
      LarkManager.instance = new LarkManager();
    }
    return LarkManager.instance;
  }

  // 1. 订阅状态
  public subscribe(handler: StateChangeHandler) {
    this.stateListeners.push(handler);
    return () => { this.stateListeners = this.stateListeners.filter(h => h !== handler); };
  }

  private notify(state: 'idle' | 'connecting' | 'connected' | 'error', msg?: string) {
    this.stateListeners.forEach(h => h(state, msg));
  }

  // 2. 连接 (核心逻辑从 Player 移到这里)
  public async connect(config: LarkConfig) {
    if (this.larkClient) {
      if (this._isConnected) this.notify('connected');
      return;
    }
    
    // 检查 window
    if (typeof window === 'undefined' || !window.larksr_websdk) {
      this.notify('error', 'SDK Script not loaded');
      return;
    }

    try {
      this.notify('connecting');
      const LarkSR = window.larksr_websdk.LarkSR;


       const client = new LarkSR({
        rootElement: this._detachedRoot, 
        serverAddress: config.serverAddress,
        // 强制 100% 填充
        fullScreen: false, 
        // 自动播放策略
        muted: true, 
      });

      
      this.larkClient = client;
      
      // 绑定事件
      client.on('error', (e: any) => this.notify('error', e.message));
      client.on('connect', () => console.log('Lark Connected'));
      
      await client.initSDKAuthCode(config.authCode);
      await client.connect({ appliId: config.appliId });
      
      this._isConnected = true;
      this.notify('connected');

    } catch (e: any) {
      console.error(e);
      this.larkClient = null;
      this._isConnected = false;
      this.notify('error', e.message || "Init Failed");
    }
  }

  // // 3. 挂载 (把视频流搬运到指定的 DOM)
  // public mountTo(container: HTMLElement) {
  //   if (!this.larkClient || !this.larkClient.videoElement) return;
    
  //   // 清空容器并把 SDK 的 Video 元素挪过来
  //   container.innerHTML = '';
  //   container.appendChild(this.larkClient.videoElement);
    
  //   // 通知 SDK 大小变了
  //   if (this.larkClient.opContainerResize) {
  //       this.larkClient.opContainerResize();
  //   }
  // }

 public mountTo(container: HTMLElement) {
          if (!this._detachedRoot) return;

    console.log("📺 LarkManager: Mounting video to container...", container);

    // 如果容器里已经有这个 root 了，就别搬了
    if (container.contains(this._detachedRoot)) {
        console.log("📺 LarkManager: Already mounted here.");
        return;
    }

    // 清空容器
    container.innerHTML = '';
    
    // 把我们的离屏 div (里面现在应该有 video 了) 搬进去
    container.appendChild(this._detachedRoot);

    // 通知 SDK 大小变了 (非常重要，否则可能是黑的)
    if (this.larkClient && this.larkClient.opContainerResize) {
        setTimeout(() => {
            this.larkClient.opContainerResize();
            console.log("📺 LarkManager: Resized SDK container.");
        }, 100);
    }
    }

  // 4. 发送消息 (供 SmartCommandCard 使用)
  public sendMessage(msg: any) {
    if (!this.larkClient || !this._isConnected) {
      console.warn("Lark not ready");
      return;
    }
    // 根据实际 SDK API 调用，通常是 emitToApp 或 sendTextToDataChannel
    console.log("LarkManager Sending:", msg);
    // this.larkClient.emitToApp(msg); 
    // 或者
    if (this.larkClient.sendTextToDataChannel) {
        this.larkClient.sendTextToDataChannel(JSON.stringify(msg));
    }
  }
  
  // 5. 销毁
  public destroy() {
      if(this.larkClient) {
          this.larkClient.destroy();
          this.larkClient = null;
          this._isConnected = false;
      }
  }
}

export const larkManager = LarkManager.getInstance();
