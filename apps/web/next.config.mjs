/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@workspace/ui"],
  
  // 允许以下源访问开发服务器
  experimental: {
    // 填入你的 VPS B 的公网 IP，或者是 EasyTier 的内网 IP，建议都加上
    allowedDevOrigins: [
      "localhost:3000", 
      "123.60.85.133",      // VPS B 的 IP (不需要加端口，或者根据实际报错调整)
      "123.60.85.133:3000", // 有时候需要带端口
      "10.126.126.3:3000"   // 机器 A 自己的内网 IP
    ],
  },
}

export default nextConfig
