import os from 'os';

export function getEasyTierIP(): string {
  const interfaces = os.networkInterfaces();
  
  for (const name of Object.keys(interfaces)) {
    const iface = interfaces[name];
    if (!iface) continue;

    for (const alias of iface) {
      // 筛选 IPv4 且非内部地址
      if (alias.family === 'IPv4' && !alias.internal) {
        // 【核心】匹配 10.126.126.x 网段
        if (alias.address.startsWith('10.126.126.')) {
          return alias.address;
        }
      }
    }
  }
  
  // 如果没找到，回退到 localhost 或者抛出错误
  console.warn("未找到 EasyTier 网卡 IP，回退到 localhost");
  return '127.0.0.1';
}
