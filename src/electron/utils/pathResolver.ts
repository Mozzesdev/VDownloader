import path from "path";
import { app } from "electron";

export const getPreloadPath = (): string => {
  const basePath = app.getAppPath();
  const preloadPath = path.join(basePath, "dist-electron/preload.cjs")
  return preloadPath;
};
