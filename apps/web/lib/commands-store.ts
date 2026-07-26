import fs from "fs/promises";
import path from "path";

import type { UserSavedCommand } from "@workspace/config";

import { resolveWorkspaceFile } from "./workspace";

let commandQueue = Promise.resolve();

export const isUserSavedCommand = (value: unknown): value is UserSavedCommand => {
  if (!value || typeof value !== "object") return false;
  const command = value as Partial<UserSavedCommand>;
  return (
    typeof command.id === "string" &&
    typeof command.templateName === "string" &&
    typeof command.title === "string" &&
    command.savedParams !== undefined
  );
};

const getCommandsPath = () => {
  const overridePath = process.env.CLOUDTEST_COMMANDS_PATH?.trim();
  return overridePath ? path.resolve(overridePath) : resolveWorkspaceFile(path.join("data", "commands.json"));
};

const ensureCommandsFile = async () => {
  const commandsPath = getCommandsPath();
  await fs.mkdir(path.dirname(commandsPath), { recursive: true });

  try {
    await fs.access(commandsPath);
  } catch {
    await fs.writeFile(commandsPath, "[]", "utf-8");
  }

  return commandsPath;
};

const writeCommandsAtomic = async (commandsPath: string, commands: UserSavedCommand[]) => {
  const tempPath = `${commandsPath}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(commands, null, 2), "utf-8");
  await fs.rename(tempPath, commandsPath);
};

const runExclusive = async <T>(task: () => Promise<T>) => {
  const previous = commandQueue;
  let release = () => {};
  commandQueue = new Promise<void>((resolve) => {
    release = resolve;
  });

  await previous;

  try {
    return await task();
  } finally {
    release();
  }
};

export const readCommands = async () => {
  const commandsPath = await ensureCommandsFile();
  const data = await fs.readFile(commandsPath, "utf-8");
  const parsed = JSON.parse(data) as unknown;

  if (!Array.isArray(parsed)) {
    throw new Error("commands.json must contain an array");
  }

  return parsed.filter(isUserSavedCommand);
};

export const upsertCommand = async (command: UserSavedCommand) =>
  runExclusive(async () => {
    const commandsPath = await ensureCommandsFile();
    const commands = await readCommands();
    const nextCommands = [command, ...commands.filter((item) => item.id !== command.id)];
    await writeCommandsAtomic(commandsPath, nextCommands);
    return command;
  });

export const deleteCommand = async (id: string) =>
  runExclusive(async () => {
    const commandsPath = await ensureCommandsFile();
    const commands = await readCommands();
    await writeCommandsAtomic(commandsPath, commands.filter((command) => command.id !== id));
  });
