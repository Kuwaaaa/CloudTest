// packages/config/src/index.ts

// =====================
// 1. 类型定义 (Types)
// =====================
export type ParamSchemaType =
  | { type: "text"; label: string }
  | { type: "readonly"; label: string }
  | { type: "switch"; label: string; desc?: string }
  | { type: "slider"; label: string; min: number; max: number; step: number; unit?: string }
  | { type: "select"; label: string; placeholder?: string; options: { value: string; label: string }[] };

export interface CommandConfig {
  name: string;
  title: string;
  defaultParams: Record<string, any>;
  schema: Record<string, ParamSchemaType>;
}

export interface UserSavedCommand {
  id: string;           // 唯一ID (UUID)
  templateName: string; // 关联的模版名称 (例如 "camera.globalMoveToTarget")
  title: string;        // 用户起的按钮名字 (例如 "环绕喷泉")
  savedParams: any;     // 用户固化的参数
}

// =====================
// 2. 模拟数据 (Mock Data)
// =====================
const FAKE_SPIN_NODES = [
  { value: "spin_haiShangGuangFu", label: "🏛️ 海上光伏" },
  { value: "spin_luShangFengDian", label: "⛲ 陆上风电" },
  { value: "spin_qingNengGongChang", label: "🚪 氢能工厂" },
  { value: "spin_keYanZhongXin", label: "🎥 科研中心" },
  { value: "spin_haiShangFengDian", label: "🎥 海上风电" },
  { value: "spin_haiShangFengDianPingTai", label: "🎥 海上风电平台" },
];

// =====================
// 2. 模拟数据 (Mock Data - Updates)
// =====================

// 1. 坐标选项：用户看地名，系统传坐标
// 格式: [经度, 纬度, 高度]
// 高度设为 50000 (50km) 作为一个宏观视角的参考值
const MOCK_AREA_POSITIONS = [
  { value: "[116.4074, 39.9042, 50000]", label: "🚩 北京 (华北)" },
  { value: "[121.4737, 31.2304, 50000]", label: "🏙️ 上海 (华东)" },
  { value: "[113.2644, 23.1291, 50000]", label: "🌴 广州 (华南)" },
  { value: "[104.0668, 30.5728, 60000]", label: "🐼 成都 (西南)" }, // 盆地地形，稍微拉高一点
  { value: "[108.9398, 34.3416, 50000]", label: "🏺 西安 (西北)" },
  { value: "[103.1533, 34.4677, 4000000]", label: "🇨🇳 中国全境 (鸟瞰)" }
];

// 2. 颜色选项：用户看颜色名，系统传 RGB 数组
const MOCK_HIGHLIGHT_COLORS = [
  { value: "[0.8, 0, 0]", label: "🔴 警示红" },
  { value: "[0, 0.5, 1]", label: "🔵 科技蓝" },
  { value: "[1, 0.8, 0]", label: "🟡 提醒金" },
  { value: "[0, 0.8, 0.2]", label: "🟢 环保绿" }
];

// 3. 对应的高亮节点名称 (如果有对应的 3D 资产 ID)
const MOCK_AREA_NAMES = [
  { value: "area_beijing", label: "北京区块" },
  { value: "area_shanghai", label: "上海区块" },
  { value: "area_guangzhou", label: "广州区块" },
  { value: "area_chengdu", label: "成都区块" },
  { value: "area_xian", label: "西安区块" },
  { value: "china", label: "中国全图" }
];



// =====================
// 3. 核心配置 (Config)
// =====================
export const CAMERA_MOVE_DATA: CommandConfig = {
  name: "camera.globalMoveToTarget",
  title: "定点环绕移动",
  defaultParams: {
    callID: "123456",
    spinNodeName: "spin_haiShangGuangFu",
    moveToDuration: 4,
    launchAltitude: 100,
    spinDistance: 100,
    spinSpeed: 1,
    updateTimeByCamera: true,
    orbitAngle: 45
  },
  schema: {
    callID: { label: "Call ID", type: "readonly" },
    spinNodeName: {
      label: "目标节点",
      type: "select",
      options: FAKE_SPIN_NODES,
      placeholder: "请选择环绕中心..."
    },
    moveToDuration: { label: "移动耗时", type: "slider", min: 1, max: 20, step: 0.5, unit: "s" },
    launchAltitude: { label: "飞行高度", type: "slider", min: 0, max: 500, step: 10, unit: "m" },
    spinDistance: { label: "环绕半径", type: "slider", min: 10, max: 300, step: 10, unit: "m" },
    spinSpeed: { label: "旋转速度", type: "slider", min: 0, max: 5, step: 0.1, unit: "rad/s" },
    orbitAngle: { label: "轨道角度", type: "slider", min: 0, max: 90, step: 1, unit: "°" },
    updateTimeByCamera: { label: "同步系统时间", type: "switch", desc: "跟随相机移动更新" },
  }
};

export const OTHER_COMMANDS: CommandConfig[] = [
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
];

// =====================
// 3. 核心配置 (Config - New API)
// =====================

export const CAMERA_AREA_DATA: CommandConfig = {
  name: "camera.globalMoveToArea",
  title: "区域漫游定位",
  // 这里设置默认值，也要符合 Schema 中的 value 格式 (字符串)
  defaultParams: {
    callID: "123456",
    targetWgsPosition: "[103.1533, 34.4677, 4000000]", // 默认全境
    isHighlightMapInFinished: true,
    isHighlightMapLineInFinished: true,
    highlightColor: "[0.8, 0, 0]", // 默认红色
    highlightDuration: 2,
    highlightScale: 1.5,
    highlightNodeName: "china",
    moveToDuration: 4,
    launchAltitude: 100,
    targetWgsHPR: "[0, -90, 0]", // 默认垂直俯视
    updateTimeByCamera: true
  },
  schema: {
    callID: { label: "Call ID", type: "readonly" },

    // === 核心修改点：将坐标包装为选项 ===
    targetWgsPosition: {
      label: "目标区域位置",
      type: "select",
      options: MOCK_AREA_POSITIONS, // 关联上面定义的坐标 Mock 数据
      placeholder: "请选择要飞行的区域..."
    },
    
    // 对应的高亮节点 ID
    highlightNodeName: {
      label: "对应高亮区块ID",
      type: "select", // 这里也可以用 select 让用户选
      options: MOCK_AREA_NAMES,
      placeholder: "选择地图上的区块ID..."
    },

    // 颜色选择
    highlightColor: {
      label: "高亮颜色",
      type: "select",
      options: MOCK_HIGHLIGHT_COLORS
    },

    // 其他参数保持原有逻辑
    moveToDuration: { label: "飞行耗时", type: "slider", min: 1, max: 20, step: 0.5, unit: "s" },
    launchAltitude: { label: "终点高度偏移", type: "slider", min: 0, max: 1000, step: 10, unit: "m" },
    
    // 姿态一般不需要用户频繁改，可以用 Text 或 Readonly，或者给几个预设
    targetWgsHPR: { 
      label: "相机姿态 [H,P,R]", 
      type: "text" 
    },

    // 开关类参数
    isHighlightMapInFinished: { label: "结束时高亮区块", type: "switch" },
    isHighlightMapLineInFinished: { label: "结束时高亮描边", type: "switch" },
    
    highlightDuration: { label: "高亮渐变时间", type: "slider", min: 0.1, max: 5, step: 0.1, unit: "s" },
    highlightScale: { label: "高亮缩放倍率", type: "slider", min: 1, max: 3, step: 0.1, unit: "x" },
    
    updateTimeByCamera: { label: "同步系统时间", type: "switch" }
  }
};



export const ALL_COMMANDS = [CAMERA_MOVE_DATA, CAMERA_AREA_DATA, ...OTHER_COMMANDS];

// 1. 定义一个变量来存 Base URL
let _apiBaseUrl = "http://127.0.0.1:3000";

// 2. 提供一个配置函数，让外部 App 调用
export const setApiBaseUrl = (url: string) => {
  _apiBaseUrl = url;
};

export const CommandService = {
    // 获取列表
    async list(): Promise<UserSavedCommand[]> {
        try {
            const res = await fetch(`${_apiBaseUrl}/api/commands`);
            if (!res.ok) throw new Error("Network response was not ok");
            return await res.json();
        } catch (error) {
            console.error("Fetch commands failed:", error);
            return []; // 失败返回空数组，防止崩溃
        }
    },

    // 保存
    async create(command: UserSavedCommand): Promise<boolean> {
        try {
            const res = await fetch(`${_apiBaseUrl}/api/commands`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(command)
            });
            return res.ok;
        } catch (error) {
            console.error("Save command failed:", error);
            return false;
        }
    }
};