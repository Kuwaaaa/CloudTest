import CloudRenderClient from "@/components/features/command-panel/CloudRenderClient";
import fs from 'fs/promises';
import path from 'path';
import { Suspense } from 'react'; // 1. 引入 Suspense

// 模拟数据库读取逻辑
async function getCommandsFromServer() {
  try {
    const DB_PATH = path.join(process.cwd(), 'data/commands.json');
    await fs.access(DB_PATH).catch(() => null);
    const data = await fs.readFile(DB_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
}

// 2. 定义一个简单的 Loading 组件 (可选，但推荐)
function LoadingFallback() {
  return (
    <div className="h-screen w-screen bg-[#0a0a0a] flex items-center justify-center text-white/50">
      <div className="animate-pulse">Loading Console...</div>
    </div>
  );
}

export default async function Page() {

  const initialData = await getCommandsFromServer();

  return (
    // 3. 用 Suspense 包裹你的 Client 组件
    // 当 useSearchParams 正在解析 URL 时，用户会看到 fallback
    <Suspense fallback={<LoadingFallback />}>
      <CloudRenderClient initialSavedCommands={initialData} />
    </Suspense>
  )
}
