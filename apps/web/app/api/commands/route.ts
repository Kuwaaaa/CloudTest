// apps/web/app/api/commands/route.ts
import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { UserSavedCommand } from '@workspace/config';

// 数据文件路径
const DB_PATH = path.join(process.cwd(), 'data/commands.json');

// 辅助函数：确保文件存在
async function ensureFile() {
  try {
    await fs.access(DB_PATH);
  } catch {
    await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
    await fs.writeFile(DB_PATH, '[]', 'utf-8');
  }
}

// GET: 获取所有保存的按钮
export async function GET() {
  await ensureFile();
  const data = await fs.readFile(DB_PATH, 'utf-8');
  const commands: UserSavedCommand[] = JSON.parse(data);
  return NextResponse.json(commands);
}

// POST: 保存新按钮
export async function POST(req: Request) {
  await ensureFile();
  const newCommand: UserSavedCommand = await req.json();
  
  // 读取旧数据
  const data = await fs.readFile(DB_PATH, 'utf-8');
  const commands: UserSavedCommand[] = JSON.parse(data);
  
  // 追加新数据
  commands.push(newCommand);
  
  // 写入文件
  await fs.writeFile(DB_PATH, JSON.stringify(commands, null, 2));
  
  return NextResponse.json({ success: true });
}

// DELETE: 删除按钮 (可选)
export async function DELETE(req: Request) {
    const { id } = await req.json();
    const data = await fs.readFile(DB_PATH, 'utf-8');
    let commands: UserSavedCommand[] = JSON.parse(data);
    commands = commands.filter(c => c.id !== id);
    await fs.writeFile(DB_PATH, JSON.stringify(commands, null, 2));
    return NextResponse.json({ success: true });
}