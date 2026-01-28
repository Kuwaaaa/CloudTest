// packages/ui/src/lib/LarkManager.ts

// 定义配置接口，方便传参
export interface LarkConfig {
  serverAddress: string;
  authCode: string;
  appliId: string;
}

// 定义回调类型，用于通知 React 组件状态变化
type StateChangeHandler = (state: 'idle' | 'connecting' | 'connected' | 'error', errorMsg?: string) => void;

class LarkManager {
  private static instance: LarkManager;
  
  // 持有 SDK 实例
  public larkClient: any | null = null;
  
  // 状态管理
  private _isConnected: boolean = false;
  
  // 订阅者列表（用于让 React 组件监听状态变化）
  private stateListeners: StateChangeHandler[] = [];

  private constructor() {}

  public static getInstance(): LarkManager {
    if (!LarkManager.instance) {
      LarkManager.instance = new LarkManager();
    }
    return LarkManager.instance;
  }

  // --- 事件订阅机制 (简易版) ---
  public subscribe(handler: StateChangeHandler) {
    this.stateListeners.push(handler);
    return () => {
      this.stateListeners = this.stateListeners.filter(h => h !== handler);
    };
  }

  private notifyState(state: 'idle' | 'connecting' | 'connected' | 'error', msg?: string) {
    this.stateListeners.forEach(h => h(state, msg));
  }

  // --- 核心方法 1: 连接 (只做一次) ---
  public async connect(config: LarkConfig) {
    const { serverAddress, authCode, appliId } = config;

    // 1. 检查是否已有实例或正在运行
    if (this.larkClient) {
      console.warn("LarkManager: Instance already exists, skipping init.");
      // 如果已经连接成功，通知一下当前状态
      if (this._isConnected) this.notifyState('connected');
      return;
    }

    // 2. 检查全局 SDK 是否加载
    if (typeof window === 'undefined' || !window.larksr_websdk) {
      const err = "Lark WebSDK not found on window object.";
      console.error(err);
      this.notifyState('error', err);
      return;
    }

    try {
      this.notifyState('connecting');
      console.log("🚀 LarkManager: Starting Init with:", { serverAddress, authCode, appliId });

      const LarkSR = window.larksr_websdk.LarkSR;
      
      // 注意：这里我们先不传 rootElement，或者传 null/document.body，因为单例初始化时 DOM 可能还不存在
      // 现在的策略是：先建立逻辑连接，稍后通过 mount 挂载画面
      // 如果 SDK 强制要求 rootElement，可以创建一个离屏 div
      const client = new LarkSR({
        rootElement: document.createElement('div'), // 临时容器，稍后通过 appendChild 搬家
        serverAddress: serverAddress,
        // 其他可能需要的默认配置...
      });

      this.larkClient = client;
      this.bindClientEvents(client);

      // 执行认证和连接流程
      await client.initSDKAuthCode(authCode);
      console.log('✅ LarkManager: Auth success, connecting...');
      
      await client.connect({ appliId: appliId });
      
      console.log('🎉 LarkManager: Enter App success');
      this._isConnected = true;
      this.notifyState('connected');

    } catch (e: any) {
      console.error('💥 LarkManager: Init Error:', e);
      this.larkClient = null; // 允许重试
      this._isConnected = false;
      this.notifyState('error', e.message || "初始化失败");
    }
  }

  // --- 核心方法 2: 挂载 (每次切换页面调用) ---
  public mount(container: HTMLElement) {
    if (!this.larkClient) return;

    console.log("📺 LarkManager: Mounting to new container");

    // 假设 SDK 创建了一个 video 元素或者是 canvas
    // 大多数 SDK 会把 DOM 元素存在 instance.videoElement 或 instance.rootElement 下
    // 如果 SDK 提供了 setContainer 方法最好，如果没有，我们需要手动搬运 DOM
    
    // 【关键点】：你需要确认 LarkSDK 生成的 DOM 结构。
    // 通常做法是找到那个被 SDK 插入内容的元素，把它剪切到新容器里
    
    // 假设 1: SDK 允许重设 rootElement (查阅文档确认)
    // this.larkClient.setRootElement(container); 

    // 假设 2: 手动搬运 (通用做法)
    // 假设刚才初始化时的临时 div 里有了 video，我们把它拿出来
    const videoEl = this.larkClient.videoElement; // 需要确认 SDK 属性名！
    if (videoEl) {
        container.innerHTML = ''; // 清空新容器
        container.appendChild(videoEl); // 移动 DOM 节点
        // 可能需要调用 SDK 的 resize 通知它容器变了
        // this.larkClient.resize(); 
    } else {
        // 如果上面都不行，尝试一种比较 Hack 的方式：
        // 很多 SDK 会在初始化传入的 rootElement 下生成内容。
        // 我们可以把我们在 connect 里创建的那个“临时 div”的内容全搬过来
        // 或者一开始 init 的时候如果不传 rootElement 会报错的话，
        // 我们可能得调整策略：init 必须传入真实的 DOM。
        // 但为了单例，我们通常创建一个全局隐藏的 div 作为 "Host"，
        // 当 LarkPlayer 挂载时，把这个 Host append 到 LarkPlayer 的 div 里。
    }
  }
  
  // --- 辅助方法：处理“搬家” (DOM Re-parenting) ---
  // 这是解决 SPA 路由切换最稳妥的办法
  // 当 init 时，我们创建一个 detached div。
  // 当 mount 时，我们把这个 detached div 塞进 React 组件的 div 里。
  private _hostElement: HTMLElement | null = null;
  
  public getHostElement() {
      if (!this._hostElement) {
          this._hostElement = document.createElement('div');
          this._hostElement.style.width = '100%';
          this._hostElement.style.height = '100%';
      }
      return this._hostElement;
  }
  
  // 修改上面的 connect 逻辑，使用 _hostElement
  // const client = new LarkSR({
  //   rootElement: this.getHostElement(), 
  //   ...
  // });

  // 修改上面的 mount 逻辑
  public mountTo(parent: HTMLElement) {
      const host = this.getHostElement();
      parent.appendChild(host);
      // 通知 SDK 窗口大小可能变了
      if(this.larkClient && this.larkClient.opContainerResize) {
          this.larkClient.opContainerResize();
      }
  }


  // --- 绑定事件 ---
  private bindClientEvents(client: any) {
    client.on('connect', () => console.log("LarkSR Event: connect"));
    
    client.on('mediaplaysuccess', () => {
      console.log("LarkSR Event: mediaplaysuccess");
      // 这里如果需要操作 Joystick/Keyboard，建议使用事件广播
      // 或者在 LarkManager 里暴露相应的方法供外部 Ref 调用
    });

    client.on('error', (e: any) => {
      const msg = e.message || e.code || "Runtime Error";
      console.error("LarkSR Event Error:", msg);
      this.notifyState('error', msg);
    });

    // ... 其他事件
  }

  // --- 发送消息 ---
  public sendMessage(msg: any) {
      if (this.larkClient && this._isConnected) {
          // 根据文档，可能是 sendText 或 emitToApp
          // 假设是 datachannel
          // this.larkClient.sendTextToDataChannel(JSON.stringify(msg));
          // 或者
          this.larkClient.emitToApp(msg);
      } else {
          console.warn("LarkManager: Cannot send message, client not ready.");
      }
  }
  
  public destroy() {
      if(this.larkClient) {
          this.larkClient.destroy();
          this.larkClient = null;
          this._isConnected = false;
          this._hostElement = null; // 清理 DOM
      }
  }
}

export const larkManager = LarkManager.getInstance();
