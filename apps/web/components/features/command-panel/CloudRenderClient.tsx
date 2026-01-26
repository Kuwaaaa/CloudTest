"use client"

import { useState, useEffect } from "react"
import { Settings2, Terminal } from "lucide-react"
import { useSearchParams } from "next/navigation";
import { Loader2, AlertCircle, RefreshCw, WifiOff } from "lucide-react" // 引入图标
import { SmartCommandCard } from "@workspace/ui/components/SmartCommandCard"
import { Button } from "@workspace/ui/components/button"
import { ALL_COMMANDS, UserSavedCommand, CommandConfig, CommandService } from "@workspace/config"
import { CreateCommandDialog } from "@/components/features/command-panel/CreateCommandDialog"
import { PxyVideo } from "app/api/lark/LarkVideo"
import CloudRenderPlayer from "@/app/api/lark/CloudRenderPlayer"
import { log } from "console";

// 定义 Props：接收服务端传来的初始数据
interface Props {
    initialSavedCommands: UserSavedCommand[]
}

// 定义连接状态类型
type ConnectionState = 'idle' | 'connecting' | 'connected' | 'error';

export default function CloudRenderClient({ initialSavedCommands }: Props) {
    // 1. 使用服务端数据初始化 state，这样首屏直接有数据，不闪烁
    const [savedCommands, setSavedCommands] = useState<UserSavedCommand[]>(initialSavedCommands)

    // 新增：连接状态管理
    const [connState, setConnState] = useState<ConnectionState>('idle');
    const [errorMsg, setErrorMsg] = useState("");

    const searchParams = useSearchParams();
    const [signalingAddress, setSignalingAddress] = useState("");

    // 处理重试逻辑（简单的刷新页面，或者通过 key 强制重新挂载组件）
    const [playerKey, setPlayerKey] = useState(0);
    const handleRetry = () => {
        setConnState('idle');
        setPlayerKey(prev => prev + 1); // 改变 key 会强制销毁并重新创建 Player 组件
        console.log('reconnected.');

    };

    useEffect(() => {
        // 1. 优先读取 URL 参数 ?server=...
        // 例如访问: http://123.60.85.133/?server=http://10.126.126.3:8181/
        const queryServer = searchParams.get("server");

        if (queryServer) {
            setSignalingAddress(queryServer);
            return;
        }

        // 2. 其次自动判断
        const hostname = window.location.hostname;
        if (hostname === "localhost" || hostname === "127.0.0.1") {
            setSignalingAddress("http://localhost:8181/");
        } else {
            setSignalingAddress("http://123.60.85.133:8181");
        }
    }, [searchParams]);

    if (!signalingAddress) return null;


    // 2. 依然保留 fetch，用于“添加按钮后”的手动刷新
    const refreshCommands = async () => {
        const data = await CommandService.list()
        setSavedCommands(data)
    }

    // 3. 数据合并逻辑 (不变)
    const userCommandCards = savedCommands.map(saved => {
        const template = ALL_COMMANDS.find(c => c.name === saved.templateName)
        if (!template) return null
        return {
            id: saved.id,
            config: {
                ...template,
                title: saved.title,
                defaultParams: saved.savedParams
            } as CommandConfig
        }
    }).filter(Boolean) as { id: string, config: CommandConfig }[]

    const handleSendCommand = (json: any) => {
        console.log("🚀 发送指令:", json)
    }

    return (
        <div className="relative h-screen w-screen overflow-hidden bg-[#0a0a0a] font-sans">

            {/* --- A. 视频层容器 --- */}
            <div className="absolute inset-0 z-0 bg-black flex items-center justify-center">

                {/* 1. 播放器组件 (始终存在，但可能被遮挡) */}
                {/* 使用 key 属性来实现重试功能 */}
                <CloudRenderPlayer
                    key={playerKey}
                    serverAddress={signalingAddress}
                    authCode="44fc6e90895a46f49eb300014eca5d17"
                    appliId="1443238700023545856"
                    onStateChange={(state, msg) => {
                        setConnState(state);
                        if (msg) setErrorMsg(msg);
                    }}
                />

                {/* 2. 状态遮罩层 (根据状态显示) */}
                {connState !== 'connected' && (
                    <div className="absolute inset-0 z-10 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center text-white space-y-6 animate-in fade-in duration-500">

                        {/* 状态：连接中 */}
                        {(connState === 'idle' || connState === 'connecting') && (
                            <>
                                <div className="relative">
                                    <div className="w-16 h-16 border-4 border-white/10 border-t-primary rounded-full animate-spin"></div>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <Loader2 className="w-6 h-6 text-primary animate-pulse" />
                                    </div>
                                </div>
                                <div className="text-center space-y-1">
                                    <h3 className="text-xl font-medium tracking-wide">正在连接云渲染服务</h3>
                                    <p className="text-sm text-white/40 font-mono">ESTABLISHING SECURE CHANNEL...</p>
                                </div>
                            </>
                        )}

                        {/* 状态：失败 */}
                        {connState === 'error' && (
                            <>
                                <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/20">
                                    <WifiOff className="w-10 h-10 text-red-500" />
                                </div>
                                <div className="text-center max-w-md px-6">
                                    <h3 className="text-xl font-medium text-red-400 mb-2">连接失败</h3>
                                    <div className="bg-red-950/30 border border-red-900/50 rounded p-3 mb-6">
                                        <p className="text-xs text-red-200/70 font-mono break-all">
                                            {errorMsg || "Connection timed out or refused."}
                                        </p>
                                    </div>

                                    <Button
                                        onClick={handleRetry}
                                        variant="outline"
                                        className="border-white/10 hover:bg-white/10 hover:text-white gap-2"
                                    >
                                        <RefreshCw className="w-4 h-4" />
                                        尝试重新连接
                                    </Button>
                                </div>
                            </>
                        )}
                    </div>
                )}

            </div>

            {/* --- B. 顶部状态栏 (HUD) --- */}
            <div className="absolute top-0 left-0 w-full p-6 z-10 flex justify-between items-start pointer-events-none">
                <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 text-white text-sm font-mono pointer-events-auto">
                    <span className="w-2 h-2 bg-green-500 rounded-full inline-block mr-2 animate-pulse"></span>
                    Connected: 10.1.1.2
                </div>

                <div className="bg-black/60 backdrop-blur-md p-2 rounded-lg border border-white/10 pointer-events-auto">
                    <Terminal className="w-5 h-5 text-white/60" />
                </div>
            </div>
            {/* 底部控制栏 */}
            <div className="absolute bottom-0 w-full z-20">
                <div className="absolute bottom-0 w-full h-64 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none" />
                <div className="relative p-6 md:p-10">
                    {/* ... 标题 ... */}

                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {/* 预设指令 */}
                        {ALL_COMMANDS.map((cmd, index) => (
                            <SmartCommandCard key={`preset-${index}`} data={cmd} sendCommand={handleSendCommand} />
                        ))}

                        {/* 自定义指令 */}
                        {userCommandCards.map((item) => (
                            <SmartCommandCard key={item.id} data={item.config} sendCommand={handleSendCommand} />
                        ))}

                        {/* 新建按钮：添加成功后调用 refreshCommands */}
                        <CreateCommandDialog onCreated={refreshCommands} />
                    </div>
                </div>
            </div>
        </div>
    )
}