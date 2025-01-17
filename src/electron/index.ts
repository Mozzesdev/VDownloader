import { app, BrowserWindow, globalShortcut } from "electron";
import path from "node:path";
import { isDev } from "./utils/util.js";
import { getPreloadPath } from "./utils/pathResolver.js";
import { handleIpc } from "./ipcHandlers.js";

const createWindow = () => {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    minWidth: 400,
    minHeight: 300,
    frame: false,
    webPreferences: {
      preload: getPreloadPath(),
      contextIsolation: true,
      nodeIntegration: true,
    },
    title: "VDownloader",
  });

  win.maximize();
  win.setMenu(null);

  globalShortcut.register("CmdOrCtrl+Shift+C", () => {
    win.webContents.toggleDevTools();
  });

  if (isDev()) {
    win.loadURL("http://localhost:5123");
  } else {
    win.loadFile(path.join(app.getAppPath(), "/dist-react/index.html"));
  }

  return win;
};

if (process.platform === "win32") app.setAppUserModelId(app.name);

app.whenReady().then(() => {
  const win = createWindow();
  handleIpc(win);
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
