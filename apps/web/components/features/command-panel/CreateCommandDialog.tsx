"use client"
import { useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@workspace/ui/components/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select"
import { ALL_COMMANDS, CommandConfig, UserSavedCommand } from "@workspace/config"

import { ParamConfigForm } from "@workspace/ui/components/SmartCommandCard"

export function CreateCommandDialog({ onCreated }: { onCreated: () => void }) {
    const [open, setOpen] = useState(false)

    // 表单状态
    const [selectedTemplate, setSelectedTemplate] = useState<CommandConfig | null>(null)
    const [customTitle, setCustomTitle] = useState("")
    const [params, setParams] = useState<any>({})

    // 处理模版切换
    const handleTemplateChange = (name: string) => {
        const template = ALL_COMMANDS.find(c => c.name === name)
        if (template) {
            setSelectedTemplate(template)
            setCustomTitle(template.title) // 默认使用模版标题
            setParams(template.defaultParams) // 重置参数
        }
    }

    // 提交保存
    const handleSave = async () => {
        if (!selectedTemplate) return

        const newCommand: UserSavedCommand = {
            id: crypto.randomUUID(),
            templateName: selectedTemplate.name,
            title: customTitle,
            savedParams: params
        }

        // 调用后端 API
        await fetch('/api/commands', {
            method: 'POST',
            body: JSON.stringify(newCommand)
        })

        setOpen(false)
        onCreated() // 通知父组件刷新列表
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="h-28 border-dashed border-white/20 hover:border-white/50 flex flex-col gap-2">
                    <Plus className="w-8 h-8 opacity-50" />
                    <span className="text-xs text-white/50">新建按钮</span>
                </Button>
            </DialogTrigger>

            <DialogContent className="max-w-md bg-[#1a1a1a] text-white border-white/10">
                <DialogHeader>
                    <DialogTitle>添加自定义按钮</DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* 1. 选择模版 */}
                    <div className="space-y-2">
                        <Label>选择指令类型</Label>
                        <Select onValueChange={handleTemplateChange}>
                            <SelectTrigger className="bg-black/20 border-white/10 text-white">
                                <SelectValue placeholder="请选择 API..." />
                            </SelectTrigger>
                            <SelectContent className="bg-[#2a2a2a] border-white/10 text-white">
                                {ALL_COMMANDS.map(cmd => (
                                    <SelectItem key={cmd.name} value={cmd.name}>{cmd.title}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {selectedTemplate && (
                        <>
                            {/* 2. 自定义名称 */}
                            <div className="space-y-2">
                                <Label>按钮名称</Label>
                                <Input
                                    value={customTitle}
                                    onChange={e => setCustomTitle(e.target.value)}
                                    className="bg-black/20 border-white/10 text-white"
                                />
                            </div>

                            {/* 3. 调整参数 (复用现有组件) */}
                            <div className="space-y-2">
                                <Label>预设参数</Label>
                                <div className="border border-white/10 rounded-md p-2 bg-black/10">
                                    <ParamConfigForm
                                        params={params}
                                        setParams={setParams}
                                        schema={selectedTemplate.schema}
                                        onSend={() => { }} // 这里的保存不需要触发执行，只做展示
                                    />
                                    {/* 注意：你需要稍微改造 ParamConfigForm，允许隐藏底部的 "执行" 按钮，或者在这里通过 CSS 隐藏它 */}
                                </div>
                            </div>

                            <Button onClick={handleSave} className="w-full">保存到列表</Button>
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}