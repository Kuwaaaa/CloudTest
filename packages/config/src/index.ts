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
  { value: "Target_A", label: "🏛️ 中心广场 (Target_A)" },
  { value: "Target_B", label: "⛲ 喷泉雕像 (Target_B)" },
  { value: "Target_C", label: "🚪 入口大门 (Target_C)" },
  { value: "Camera_Pos_1", label: "🎥 监控机位 #1" },
];

// =====================
// 3. 核心配置 (Config)
// =====================
export const CAMERA_MOVE_DATA: CommandConfig = {
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

export const ALL_COMMANDS = [CAMERA_MOVE_DATA, ...OTHER_COMMANDS];

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