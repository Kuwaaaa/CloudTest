import fs from "fs";
import path from "path";

export const getWorkspaceRoot = () => {
  const cwd = process.cwd();
  if (fs.existsSync(path.join(cwd, "apps")) && fs.existsSync(path.join(cwd, "packages"))) {
    return cwd;
  }

  const parentRoot = path.resolve(cwd, "..", "..");
  if (fs.existsSync(path.join(parentRoot, "apps")) && fs.existsSync(path.join(parentRoot, "packages"))) {
    return parentRoot;
  }

  return cwd;
};

export const resolveWorkspaceFile = (relativePath: string) => {
  const overrideRoot = process.env.CLOUDTEST_WORKSPACE_ROOT?.trim();
  return path.resolve(overrideRoot || getWorkspaceRoot(), relativePath);
};

export const ensureParentDirSync = (filePath: string) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
};

export const writeFileAtomicSync = (filePath: string, content: string) => {
  ensureParentDirSync(filePath);
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tempPath, content, "utf-8");
  fs.renameSync(tempPath, filePath);
};
