// packages/ui/src/index.ts

// 导出组件
export { default as Go2RTCPlayer } from './components/Go2RTCPlayer';
export { SmartCommandCard } from './components/SmartCommandCard';
// ... 导出其他组件

// 导出工具类 (解决你的报错)
export * from './lib/ControlClient'
export * from './lib/Go2RTCClient';
