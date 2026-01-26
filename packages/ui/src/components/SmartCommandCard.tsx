"use client"

import { useState } from "react"
import { Settings2, Play, Save, Check } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Switch } from "@workspace/ui/components/switch"
import { Slider } from "@workspace/ui/components/slider"
import { ScrollArea } from "@workspace/ui/components/scroll-area"
import { Label } from "@workspace/ui/components/label"
import { Badge } from "@workspace/ui/components/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@workspace/ui/components/popover"

// 引入 Shadcn UI 的 Select 组件
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@workspace/ui/components/select"

// ==========================================
// 0. 模拟数据 (Mock Data)
// ==========================================
const FAKE_SPIN_NODES = [
    { value: "Target_A", label: "🏛️ 中心广场 (Target_A)" },
    { value: "Target_B", label: "⛲ 喷泉雕像 (Target_B)" },
    { value: "Target_C", label: "🚪 入口大门 (Target_C)" },
    { value: "Camera_Pos_1", label: "🎥 监控机位 #1" },
]

// ==========================================
// 1. 数据定义区域
// ==========================================

const CAMERA_MOVE_DATA = {
    name: "camera.globalMoveToTarget",
    title: "定点环绕移动",
    defaultParams: {
        callID: "123456",
        spinNodeName: "Target_A",
        moveToDuration: 4,
        launchAltitude: 100,
        spinDistance: 100,
        spinSpeed: 1,
        updateTimeByCamera: true,
        orbitAngle: 45
    },
    schema: {
        callID: { label: "Call ID", type: "readonly" },
        // --- 新增 Select 类型配置 ---
        spinNodeName: {
            label: "目标节点",
            type: "select",
            options: FAKE_SPIN_NODES, // 传入选项列表
            placeholder: "请选择环绕中心..."
        },
        moveToDuration: { label: "移动耗时", type: "slider", min: 1, max: 20, step: 0.5, unit: "s" },
        launchAltitude: { label: "飞行高度", type: "slider", min: 0, max: 500, step: 10, unit: "m" },
        spinDistance: { label: "环绕半径", type: "slider", min: 10, max: 300, step: 10, unit: "m" },
        spinSpeed: { label: "旋转速度", type: "slider", min: 0, max: 5, step: 0.1, unit: "rad/s" },
        orbitAngle: { label: "轨道角度", type: "slider", min: 0, max: 90, step: 1, unit: "°" },
        updateTimeByCamera: { label: "同步系统时间", type: "switch", desc: "跟随相机移动更新" },
    }
}

const OTHER_COMMANDS = [
    {
        name: "env.setWeather",
        title: "天气控制",
        defaultParams: { rain: 0, fog: 0.5 },
        schema: {
            rain: { label: "降雨量", type: "slider", min: 0, max: 1, step: 0.1 },
            fog: { label: "雾气浓度", type: "slider", min: 0, max: 1, step: 0.1 }
        }
    },
    {
        name: "system.reset",
        title: "重置位置",
        defaultParams: { force: false },
        schema: { force: { label: "强制重置", type: "switch" } }
    }
]

const ALL_COMMANDS = [CAMERA_MOVE_DATA, ...OTHER_COMMANDS]


// ==========================================
// 2. 组件区域
// ==========================================

// --- A. 参数配置表单 (ParamConfigForm) ---
function ParamConfigForm({ params, setParams, schema, onSend }: any) {

    const updateValue = (key: string, value: any) => {
        setParams((prev: any) => ({ ...prev, [key]: value }))
    }

    return (
        <div className="flex flex-col w-full">
            {/* 滚动区域 */}
            <ScrollArea className="h-[300px] w-full">
                <div className="p-3 space-y-3">
                    {Object.keys(params).map((key) => {
                        const config = schema[key] || { label: key, type: "text" }
                        const value = params[key]

                        return (
                            <div
                                key={key}
                                className="p-3 border border-white/10 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                            >
                                {/* 1. 渲染下拉选择 (Select) - 新增部分 */}
                                {config.type === "select" && (
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-bold text-white/40 uppercase tracking-wider">
                                            {config.label}
                                        </Label>
                                        <Select
                                            value={String(value)}
                                            onValueChange={(v) => updateValue(key, v)}
                                        >
                                            <SelectTrigger className="w-full h-8 text-xs bg-black/20 border-white/10 text-white focus:ring-1 focus:ring-white/30 focus:ring-offset-0">
                                                <SelectValue placeholder={config.placeholder} />
                                            </SelectTrigger>
                                            <SelectContent
                                                // 确保下拉菜单在深色背景下可见，并防止被 Popover 遮挡
                                                className="bg-[#1a1a1a] border-white/10 text-white shadow-xl z-50"
                                            >
                                                {config.options?.map((opt: any) => (
                                                    <SelectItem
                                                        key={opt.value}
                                                        value={opt.value}
                                                        className="text-xs hover:bg-white/10 focus:bg-white/10 cursor-pointer"
                                                    >
                                                        {opt.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}

                                {/* 2. 渲染滑块 (Slider) */}
                                {config.type === "slider" && (
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <Label className="text-xs font-medium text-white/70">{config.label}</Label>
                                            <Badge variant="outline" className="h-5 px-1.5 font-mono text-[10px] text-white border-white/20">
                                                {value}{config.unit}
                                            </Badge>
                                        </div>
                                        <Slider
                                            className="py-1"
                                            value={[Number(value)]} min={config.min} max={config.max} step={config.step}
                                            onValueChange={(v) => updateValue(key, v[0])}
                                        />
                                    </div>
                                )}

                                {/* 3. 渲染开关 (Switch) */}
                                {config.type === "switch" && (
                                    <div className="flex justify-between items-center min-h-[24px]">
                                        <div className="space-y-0.5">
                                            <Label className="text-xs font-medium text-white/90">{config.label}</Label>
                                            {config.desc && <p className="text-[10px] text-white/50">{config.desc}</p>}
                                        </div>
                                        <Switch
                                            checked={Boolean(value)}
                                            onCheckedChange={(v) => updateValue(key, v)}
                                            className="scale-75 origin-right data-[state=checked]:bg-primary"
                                        />
                                    </div>
                                )}

                                {/* 4. 渲染文本输入 (Input) */}
                                {config.type === "text" && (
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-bold text-white/40 uppercase tracking-wider">{config.label}</Label>
                                        <Input
                                            value={String(value)}
                                            onChange={(e) => updateValue(key, e.target.value)}
                                            className="h-8 text-sm border-x-0 border-t-0 border-b border-white/20 rounded-none px-0 bg-transparent focus-visible:ring-0 text-white placeholder:text-white/20"
                                        />
                                    </div>
                                )}

                                {/* 5. 渲染只读 (Readonly) */}
                                {config.type === "readonly" && (
                                    <div className="flex justify-between items-center opacity-50">
                                        <Label className="text-xs text-white/60">{config.label}</Label>
                                        <span className="font-mono text-[10px] text-white/60">{value}</span>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </ScrollArea>

            {/* 底部按钮 */}
            <div className="p-3 border-t border-white/10 bg-white/5">
                <Button
                    className="w-full h-9 text-sm gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg"
                    onClick={onSend}
                >
                    <Save className="w-3.5 h-3.5" />
                    应用配置并执行
                </Button>
            </div>
        </div>
    )
}

// ... (SmartCommandCard 组件保持不变，直接复用即可)
interface SmartCommandCardProps {
    data: { title: string; name: string; defaultParams: any; schema: any }
    sendCommand: (payload: any) => void
}

function SmartCommandCard({ data, sendCommand }: SmartCommandCardProps) {
    const [open, setOpen] = useState(false)
    const [currentParams, setCurrentParams] = useState(data.defaultParams)
    const [isSent, setIsSent] = useState(false)

    const triggerFeedback = () => {
        setIsSent(true)
        setTimeout(() => setIsSent(false), 1000)
    }

    const handleQuickRun = () => {
        const payload = { name: data.name, params: currentParams }
        sendCommand(payload)
        triggerFeedback()
    }

    const handleConfigRun = () => {
        const payload = { name: data.name, params: currentParams }
        sendCommand(payload)
        setOpen(false)
        triggerFeedback()
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <div className="relative group w-full h-full select-none">
                <Button
                    variant="outline"
                    className={`
            w-full h-28 flex flex-col items-center justify-center gap-3 border-2 
            backdrop-blur-md rounded-xl transition-all duration-500 active:scale-[0.98]
            ${isSent
                            ? "bg-green-500/20 border-green-500 text-green-100 shadow-[0_0_30px_rgba(34,197,94,0.2)]"
                            : "bg-black/40 border-white/10 hover:bg-black/60 hover:border-primary/50 text-white"
                        }
          `}
                    onClick={handleQuickRun}
                >
                    <div className={`
            p-3 rounded-full transition-all duration-500 ease-out
            ${isSent
                            ? "bg-green-500 text-white rotate-[360deg] scale-110"
                            : "bg-white/10 group-hover:bg-primary group-hover:text-black"
                        }
          `}>
                        {isSent ? (
                            <Check className="w-6 h-6 stroke-[3px]" />
                        ) : (
                            <Play className="w-6 h-6 ml-0.5 fill-current" />
                        )}
                    </div>

                    <div className="flex flex-col items-center">
                        <span className={`text-base font-bold tracking-wide transition-all duration-300 ${isSent ? "text-green-200 scale-105" : ""}`}>
                            {isSent ? "指令已发送" : data.title}
                        </span>
                        <span className={`text-[10px] font-mono max-w-[120px] truncate transition-colors duration-300 ${isSent ? "text-green-300/60" : "text-white/40"}`}>
                            {data.name}
                        </span>
                    </div>
                </Button>

                <PopoverTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 w-8 h-8 text-white/30 hover:text-white hover:bg-white/10 rounded-full z-10 transition-colors"
                        onClick={(e) => {
                            e.stopPropagation()
                            setOpen(true)
                        }}
                    >
                        <Settings2 className="w-4 h-4" />
                    </Button>
                </PopoverTrigger>

            </div>

            <PopoverContent
                side="top"
                align="end"
                sideOffset={12}
                className="w-[320px] p-0 bg-[#1a1a1a]/95 backdrop-blur-xl border border-white/20 text-white shadow-2xl rounded-xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-2"
            >
                <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2 bg-white/5">
                    <Settings2 className="w-4 h-4 text-primary" />
                    <span className="font-bold text-sm text-white">配置参数</span>
                </div>

                <ParamConfigForm
                    params={currentParams}
                    setParams={setCurrentParams}
                    schema={data.schema}
                    onSend={handleConfigRun}
                />
            </PopoverContent>

        </Popover>
    )
}

export { SmartCommandCard, ParamConfigForm };
