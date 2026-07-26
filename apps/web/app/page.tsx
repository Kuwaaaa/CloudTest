import { Suspense } from "react";

import CloudRenderClient from "@/components/features/command-panel/CloudRenderClient";
import { readCommands } from "@/lib/commands-store";
import { readRuntimeConfig } from "@/lib/runtime-config";

async function getCommandsFromServer() {
  try {
    return await readCommands();
  } catch {
    return [];
  }
}

function LoadingFallback() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-[#0a0a0a] text-white/50">
      <div className="animate-pulse">Loading Console...</div>
    </div>
  );
}

export default async function Page() {
  const initialData = await getCommandsFromServer();
  const initialRuntimeConfig = readRuntimeConfig();

  return (
    <Suspense fallback={<LoadingFallback />}>
      <CloudRenderClient
        initialSavedCommands={initialData}
        initialRuntimeConfig={initialRuntimeConfig}
      />
    </Suspense>
  );
}
