"use client"

import { useState, useEffect, useRef } from "react"
import { Settings2, Terminal, ChevronDown, ChevronUp, GripHorizontal } from "lucide-react"
import { useSearchParams } from "next/navigation";
import { Loader2, AlertCircle, RefreshCw, WifiOff } from "lucide-react" // 引入图标
import { SmartCommandCard } from "@workspace/ui/components/SmartCommandCard"
import { Button } from "@workspace/ui/components/button"
import { ALL_COMMANDS, UserSavedCommand, CommandConfig, CommandService } from "@workspace/config"
import { CreateCommandDialog } from "@/components/features/command-panel/CreateCommandDialog"
import { RTCConnectionState } from "@workspace/ui/lib/Go2RTCClient"; // 引入类型
import { larkManager } from "@workspace/ui/lib/LarkManager"; // 导入单例

import Go2RTCPlayer from "@workspace/ui/components/Go2RTCPlayer"

import { ControlClient } from "@workspace/ui/lib/ControlClient"

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
    const [connState, setConnState] = useState<RTCConnectionState>('idle');
    const [errorMsg, setErrorMsg] = useState("");

    const searchParams = useSearchParams();
    const [signalingAddress, setSignalingAddress] = useState("");

    // 处理重试逻辑（简单的刷新页面，或者通过 key 强制重新挂载组件）
    const [playerKey, setPlayerKey] = useState(0);
    const [isPanelVisible, setIsPanelVisible] = useState(true);

    // 1. 使用 ref 持有 WebSocket 客户端实例
    const controlRef = useRef<ControlClient | null>(null);

    // 2. 初始化连接
    useEffect(() => {
        // 生产环境地址 (VPS Nginx)
        const wsUrl = "ws://123.60.85.133/control/";
        // 本地调试地址 (如果你还在本地跑)
        // const wsUrl = "ws://127.0.0.1:8888/";

        const client = new ControlClient(wsUrl);
        client.connect();
        controlRef.current = client;

        return () => {
            client.disconnect();
        };
    }, []);

    // 3. 【核心】这就是你要传下去的函数
    const handleSendCommand = (json: any) => {
        console.log("🚀 发送指令:", json);
        controlRef.current?.send(json);
    };


    // Go2RTC 默认 API 端口 1984
    // 协议是 ws，路径是 /api/ws，参数 src=你的流名称(p_cg)
    // const streamUrl = "ws://127.0.0.1:1984/api/ws?src=p_cg";
    const streamUrl = "http://127.0.0.1:1984/api/webrtc?src=p_cg";

    const handleRetry = () => {
        setConnState('idle');
        setPlayerKey(prev => prev + 1); // 改变 key 会强制销毁并重新创建 Player 组件
        console.log('reconnected.');

    };

    // // 【修改点】
    // // 现在的 handleSendCommand 非常简单直接
    // const handleSendCommand = (json: any) => {
    //     // 直接调用单例发送消息
    //     larkManager.sendMessage(json);
    //     console.log("🚀 发送指令:", json);
    // }

    // 2. 依然保留 fetch，用于“添加按钮后”的手动刷新
    const refreshCommands = async () => {
        const data = await CommandService.list()
        setSavedCommands(data)
    }

    // 2. 处理状态回调
    const handleStateChange = (state: RTCConnectionState, msg?: string) => {
        setConnState(state);
        if (msg) setErrorMsg(msg);
    };

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

    return (
        <div className="relative h-screen w-screen overflow-hidden bg-[#0a0a0a] font-sans">

            {/* --- A. 视频层容器 --- */}
            <div className="absolute inset-0 z-0 bg-black flex items-center justify-center">

                {/* 1. 播放器组件 (始终存在，但可能被遮挡) */}
                {/* 使用 key 属性来实现重试功能 */}
                <div className="w-[800px] h-[600px] border border-gray-500">
                    <Go2RTCPlayer streamName='p_cg' onStateChange={handleStateChange} />
                </div>

                {/* 2. 状态遮罩层 (根据状态显示) */}
                {/* --- 遮罩层 (逻辑保持在你原来的 CloudRenderClient 里) --- */}
                {connState !== 'connected' && (
                    <div className="absolute inset-0 z-10 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center text-white animate-in fade-in">

                        {/* Connecting UI */}
                        {(connState === 'idle' || connState === 'connecting') && (
                            <div className="flex flex-col items-center gap-4">
                                <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                                <p className="font-mono text-sm tracking-widest text-blue-200">
                                    CONNECTING TO RENDER SERVER...
                                </p>
                            </div>
                        )}

                        {/* Error UI */}
                        {connState === 'error' && (
                            <div className="flex flex-col items-center gap-4">
                                <div className="text-red-500 text-5xl">⚠</div>
                                <h3 className="text-xl font-bold">Connection Failed</h3>
                                <p className="text-red-300/70 font-mono bg-red-950/50 px-4 py-2 rounded">
                                    {errorMsg}
                                </p>
                                <button
                                    onClick={() => window.location.reload()}
                                    className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded transition"
                                >
                                    Retry Connection
                                </button>
                            </div>
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

            {/* --- 底部控制栏 (添加抽屉效果) --- */}
            {/* 
                原理：
                1. 使用 absolute bottom-0 固定在底部
                2. transition-transform 负责动画
                3. 根据 isPanelVisible 切换 translate-y
                4. translate-y-full 会完全移出屏幕，所以我们用 translate-y-[100%] 但实际上我们把 Toggle 按钮放在了负 margin 上
            */}
            <div
                className={`
                    absolute bottom-0 w-full z-20 
                    transition-transform duration-500 cubic-bezier(0.4, 0, 0.2, 1)
                    ${isPanelVisible ? "translate-y-0" : "translate-y-full"}
                `}
            >
                {/* 
                   === 核心新增：控制手柄 (Toggle Handle) === 
                   绝对定位到父容器的顶部外侧 (-top-8)，这样当父容器缩下去时，
                   这个按钮刚好停在屏幕最底部。
                */}
                <div className="absolute -top-10 w-full flex justify-center pointer-events-none">
                    <button
                        onClick={() => setIsPanelVisible(!isPanelVisible)}
                        className="
                            pointer-events-auto
                            flex items-center justify-center gap-2
                            h-10 px-8 
                            bg-black/80 backdrop-blur-xl
                            border-t border-x border-white/10
                            rounded-t-xl
                            text-white/70 hover:text-white hover:bg-primary/80
                            shadow-[0_-5px_15px_rgba(0,0,0,0.3)]
                            transition-all duration-300
                            group
                        "
                    >
                        {isPanelVisible ? (
                            <>
                                <span className="text-[10px] font-bold tracking-widest opacity-0 group-hover:opacity-100 transition-opacity -ml-4 translate-x-2 group-hover:translate-x-0">
                                    HIDE
                                </span>
                                <ChevronDown className="w-5 h-5 animate-bounce-slow" />
                            </>
                        ) : (
                            <>
                                <ChevronUp className="w-5 h-5 -translate-y-0.5" />
                                <span className="text-[10px] font-bold tracking-widest">
                                    CONTROLS
                                </span>
                            </>
                        )}
                    </button>
                </div>

                {/* 
                    内容容器 
                    注意：移除了原本的 'h-64' 固定高度渐变，改为自适应高度的内容包裹，
                    并添加了实体的背景色，防止收起后还能透过看到地图。
                */}
                <div className="relative w-full bg-[#0a0a0a]/90 backdrop-blur-xl border-t border-white/10 pb-6 pt-2">
                    {/* 装饰性光效 */}
                    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />

                    <div className="relative px-6 md:px-10 py-6">
                        {/* 标题栏 (可选) */}
                        {/* <div className="mb-4 flex items-center justify-between text-white/40 text-xs font-mono uppercase tracking-wider">
                            <span>Command Center</span>
                            <span>v2.0</span>
                        </div> */}

                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            {/* 预设指令 */}
                            {ALL_COMMANDS.map((cmd, index) => (
                                <SmartCommandCard key={`preset-${index}`} data={cmd} sendCommand={handleSendCommand} />
                            ))}

                            {/* 自定义指令 */}
                            {userCommandCards.map((item) => (
                                <SmartCommandCard key={item.id} data={item.config} sendCommand={handleSendCommand} />
                            ))}

                            {/* 新建按钮 */}
                            <CreateCommandDialog onCreated={refreshCommands} />
                        </div>
                    </div>

                    {/* 底部安全区 (防止 iPhone 底部横条遮挡) */}
                    <div className="h-4 w-full" />
                </div>
            </div>
        </div>
    )
}