// packages/ui/src/global.d.ts
export {};

declare global {
  interface Window {
    larksr_websdk: any; // 或者更具体的类型
    pxy_webcommonui: any;
  }
}
