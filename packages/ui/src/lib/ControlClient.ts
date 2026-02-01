export class ControlClient {
  private ws: WebSocket | null = null;
  private url: string;

  constructor(url: string) {
    this.url = url;
  }

  public connect() {
    if (this.ws) return;
    
    console.log(`[Control] Connecting to ${this.url}`);
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      console.log("[Control] Connected");
    };

    this.ws.onclose = () => {
      console.log("[Control] Disconnected");
      this.ws = null;
      // 简单断线重连 (5秒后重试)
      setTimeout(() => this.connect(), 5000);
    };

    this.ws.onerror = (e) => {
        console.error("[Control] Error:", e);
    };
  }

  public send(cmd: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(cmd));
    } else {
      console.warn("[Control] Not connected. Dropping message:", cmd);
    }
  }

  public disconnect() {
    if (this.ws) {
        this.ws.onclose = null; // 防止触发重连
        this.ws.close();
        this.ws = null;
    }
  }
}
